import { ethers } from "ethers";
import { UnifiedMinimalABI } from "../constants";

export const monitorEventsAtBlock = async (
  blocknumber: number,
  provider: ethers.Provider,
  contractsConfig: { [address: string]: string[] }
) => {
  console.time(`monitor-${blocknumber}`);
  try {
    const eventPromises = Object.entries(contractsConfig).map(async ([address, events]) => {
      const contract = new ethers.Contract(address, UnifiedMinimalABI, provider);
      
      const eventLogsPromises = events.map(eventName =>
        contract.queryFilter(contract.filters[eventName](), blocknumber, blocknumber)
          .then(eventLogs => eventLogs.map(log => {
            // Get the event fragment
            const eventFragment = contract.interface.getEvent(eventName);
            
            // Decode the event data
            const decodedData = contract.interface.decodeEventLog(
              eventFragment!,
              log.data,
              log.topics
            );

            // Create an object with named parameters
            const args: { [key: string]: any } = {};
            eventFragment!.inputs.forEach((input, index) => {
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
          .catch((error: unknown) => {
            const err = error as { code?: string; argument?: string };
            if (err.code === 'INVALID_ARGUMENT' && err.argument === 'address') {
              console.warn(`Contract at address ${address} does not exist at block ${blocknumber}.`);
            } else {
              console.error(`Error querying event ${eventName} for address ${address}:`, error);
            }
            return []; 
          })
      );
      return Promise.allSettled(eventLogsPromises);
    });

    const eventResults = await Promise.allSettled(eventPromises);
    
    // Create an array to store all processed events
    let processedEvents: any[] = [];
    
    // Process and organize the results
    eventResults.forEach(result => {
      if (result.status === 'fulfilled') {
        // Each result.value is an array of Promise.allSettled results
        result.value.forEach(settlementResult => {
          if (settlementResult.status === 'fulfilled') {
            // Add the events to our processed array
            processedEvents = processedEvents.concat(settlementResult.value);
          }
        });
      }
    });

    // Now processedEvents contains all your event data in a flat array
    // You can organize it however you want, here's an example:
    const organizedEvents = processedEvents.reduce((acc: any, event) => {
      // Group by event name
      if (!acc[event.eventName]) {
        acc[event.eventName] = [];
      }
      
      // Create a cleaned up event object with the most important data
      const cleanEvent = {
        txhash: event.txhash,
        blocknumber: event.blocknumber,
        address: event.address,
        args: event.args,           // Named parameters
        decodedData: event.decodedData  // Raw decoded values
      };
      
      acc[event.eventName].push(cleanEvent);
      return acc;
    }, {});

    console.log('Organized Events:', organizedEvents);
    return organizedEvents;  // Return the organized data

  } catch (e) {
    console.log(e);
    return {};  // Return empty object in case of error
  } finally {
    console.timeEnd(`monitor-${blocknumber}`);
  }
};
