import { ethers } from "ethers";
import { UnifiedMinimalABI } from "~/constants";

interface ParsedEvent {
  eventName: string;
  txhash: string;
  blocknumber: number;
  address: string;
  topics: string[];
  interface: ethers.EventFragment;
  args: Record<string, unknown>;
  rawData: string;
  decodedData: Record<string, unknown>;
}

export const monitorEventsAtBlock = async (
  blocknumber: number,
  provider: ethers.Provider,
  contractsConfig: { [address: string]: string[] }
): Promise<Record<string, ParsedEvent[]>> => {
  console.time(`monitor-${blocknumber}`);
  try {
    const allEventPromises = Object.entries(contractsConfig).flatMap(([address, events]) => {
      const contract = new ethers.Contract(address, UnifiedMinimalABI, provider);
      
      const eventLogsPromises = events.map(eventName =>
        contract.queryFilter(contract.filters[eventName](), blocknumber, blocknumber)
          .then(eventLogs => eventLogs.map(log => {
            // Get the event fragment
            const eventFragment = contract.interface.getEvent(eventName);
            if (!eventFragment) return;
            // Decode the event data
            const decodedData = contract.interface.decodeEventLog(
              eventFragment,
              log.data,
              log.topics
            );

            // Create an object with named parameters
            const args: Record<string, unknown> = {};
            eventFragment.inputs.forEach((input, index) => {
              args[input.name] = decodedData[index];
            });

            return {
              eventName,
              txhash: log.transactionHash,
              blocknumber: log.blockNumber,
              address: log.address,
              topics: log.topics,
              interface: eventFragment,
              args: args,
              rawData: log.data,
              decodedData
            };
          }))
          
          .catch((err) => {
            if (err.code === 'INVALID_ARGUMENT' && err.argument === 'address') {
              console.warn(`Contract at address ${address} does not exist at block ${blocknumber}.`);
            } else {
              console.error(`Error querying event ${eventName} for address ${address}:`, err);
            }
            return undefined; 
          })
      );
      return Promise.allSettled(eventLogsPromises).then(results => 
        results.map(result => {
          if (result.status === 'rejected') {
            console.error('Promise rejected:', result.reason);
            return { status: 'fulfilled', value: [] }; // Convert rejected to fulfilled with empty array
          }
          return result;
        })
      );
    });


    const results = await Promise.allSettled(allEventPromises);

    // Process results directly into organized events
    const organizedEvents = results.reduce((acc: Record<string, ParsedEvent[]>, result) => {
      if (result.status === 'fulfilled') {
        result.value.forEach(eventResult => {
          if (eventResult.status === 'fulfilled') {
            eventResult.value?.forEach(event => {
              if (!event) return;
              
              if (!acc[event.eventName]) {
                acc[event.eventName] = [] as ParsedEvent[];
              }
              acc[event.eventName].push({
                eventName: event.eventName,
                txhash: event.txhash,
                blocknumber: event.blocknumber,
                address: event.address,
                topics: [...event.topics], // Convert readonly array to mutable array
                interface: event.interface,
                args: event.args,
                rawData: event.rawData,
                decodedData: event.decodedData
              });
            });
          }
        });
      }
      return acc;
    }, {});
    
    console.log('Organized Events:', organizedEvents);
    return organizedEvents;
  } catch (e) {
    console.log(e);
    return {}
  } finally {
    console.timeEnd(`monitor-${blocknumber}`);
  }
};
