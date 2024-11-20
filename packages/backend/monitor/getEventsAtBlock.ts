import { ethers } from "ethers";
import { getGovBodyFromAddress, UnifiedMinimalABI, EventsMapping, getCategory } from "../constants";
import { ParsedEvent } from "./interfaces";

export const monitorEventsAtBlock = async (
  blocknumber: number,
  provider: ethers.Provider,
  contractsConfig: { [address: string]: string[] }
): Promise<ParsedEvent[]> => {
  console.time(`monitor-${blocknumber}`);
  try {
    const allEventPromises = Object.entries(contractsConfig).flatMap(([address, events]) => {
      const contract = new ethers.Contract(address, UnifiedMinimalABI, provider);
      
      const eventLogsPromises = events.map(eventName =>
        contract.queryFilter(eventName, blocknumber, blocknumber)
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
      return eventLogsPromises; 
    });


    const results = await Promise.allSettled(allEventPromises);
    const block = await provider.getBlock(blocknumber);
    const blockTimestamp = block?.timestamp ? new Date(block.timestamp * 1000) : new Date();
		// check result status rejected

    // Process results directly into organized events
    const organizedEvents = results.flatMap((result) => {
			if (result.status === 'fulfilled' && result.value !== undefined) {
        return result.value.filter(e => e != undefined).map(event => {
              console.log(event, 'here', event?.interface.inputs);
              // Construct the RSS feed item
              return {
                interface: event.interface,
                rawData: event.rawData,
                decodedData: event.decodedData,
                description: '', // Add a default empty description
                title: `${event.eventName} - ${getGovBodyFromAddress(event.address)}`,
                link: event.address.toLowerCase() in EventsMapping["Ethereum Mainnet"] ? 
                  `https://etherscan.io/tx/${event.txhash}` :
                  `https://explorer.zksync.io/tx/${event.txhash}`,
                txhash: event.txhash,
                eventName: event.eventName,
                blocknumber: event.blocknumber,
                address: event.address,
                args: event.args,
                topics: [getCategory(event.address)],
                timestamp: blockTimestamp.toISOString(),
                proposalLink: event.args.proposalId ? 
                  `https://vote.zknation.io/dao/proposal/${event.args.proposalId}?govId=eip155:${
                    event.address.toLowerCase() in EventsMapping["Ethereum Mainnet"] ? '1' : '324'
                  }:${event.address}` : '',
                networkName: event.address.toLowerCase() in EventsMapping["Ethereum Mainnet"] ? 'Ethereum Mainnet' : 'ZKSync Era',
                chainId: event.address.toLowerCase() in EventsMapping["Ethereum Mainnet"] ? '1' : '324'
              };
        })
			}
    }, {});
    console.log('Organized Events:', organizedEvents);
    return organizedEvents.filter(e => e !== undefined);
  } catch (e) {
    console.log(e);
    return []
  } finally {
    console.timeEnd(`monitor-${blocknumber}`);
  }
};
