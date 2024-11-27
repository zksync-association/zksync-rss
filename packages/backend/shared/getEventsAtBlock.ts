import { ethers } from "ethers";
import { UnifiedMinimalABI, EventsMapping, ParsedEvent, getCategory, getGovBodyFromAddress } from "~/shared";

export const monitorEventsAtBlock = async (
  blocknumber: number,
  provider: ethers.Provider,
  contractsConfig: { [address: string]: string[] }
): Promise<ParsedEvent[]> => {
  console.time(`monitor-${blocknumber}`);
  try {
    // First, verify block exists
    const block = await provider.getBlock(blocknumber);
    if (!block) {
      throw new Error(`🚨 CRITICAL: Block ${blocknumber} not found!`);
    }
    if (!block.timestamp) {
      throw new Error(`🚨 CRITICAL: Block ${blocknumber} has no timestamp!`);
    }
    const blockTimestamp = new Date(block.timestamp * 1000);
    console.log(`📅 Processing block ${blocknumber} from ${blockTimestamp.toISOString()}`);

    const allEventPromises = Object.entries(contractsConfig).flatMap(([address, events]) => {
      console.log(`🔍 Checking contract ${address} for events: ${events.join(', ')}`);
      const contract = new ethers.Contract(address, UnifiedMinimalABI, provider);
      
      const eventLogsPromises = events.map(eventName =>
        contract.queryFilter(eventName, blocknumber, blocknumber)
          .then(eventLogs => {
            console.log(`✅ Found ${eventLogs.length} ${eventName} events for ${address}`);
            return eventLogs.map(log => {
              const eventFragment = contract.interface.getEvent(eventName);
              if (!eventFragment) {
                throw new Error(`🚨 Failed to get event fragment for ${eventName} on ${address}`);
              }

              try {
                const decodedData = contract.interface.decodeEventLog(
                  eventFragment,
                  log.data,
                  log.topics
                );

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
              } catch (decodeError) {
                throw new Error(`🚨 Failed to decode event ${eventName} on ${address}: ${(decodeError as unknown as Error).message}`);
              }
            });
          })
          .catch((err) => {
            const errorMessage = `
                🚨 CRITICAL ERROR PROCESSING EVENT 🚨
                Block: ${blocknumber}
                Contract: ${address}
                Event: ${eventName}
                Error: ${err.message}
                ${err.stack}
            `;
            console.error(errorMessage);
            throw new Error(errorMessage);
          })
      );
      return eventLogsPromises;
    });

    const results = await Promise.all(allEventPromises); // Changed from allSettled to all
    
    // Process results directly into organized events
    const organizedEvents = results.flatMap((result) => {
      if (!result) {
        throw new Error(`🚨 Received null result when processing events at block ${blocknumber}`);
      }
      
      return result.filter(e => e != undefined).map(event => {
        if (!event?.interface) {
          throw new Error(`🚨 Invalid event data at block ${blocknumber}`);
        }

        return {
          interface: event.interface,
          rawData: event.rawData,
          decodedData: event.decodedData,
          description: '',
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
      });
    });

    if (!organizedEvents.length) {
      console.log(`ℹ️ No events found at block ${blocknumber}`);
    } else {
      console.log(`✅ Successfully processed ${organizedEvents.length} events at block ${blocknumber}`);
    }

    return organizedEvents;
  } catch (err: unknown) {
    const errorMessage = `
      🚨 FATAL ERROR PROCESSING BLOCK 🚨
      Block: ${blocknumber}
      Error: ${(err as Error).message}
      ${(err as Error).stack}
    `;
    console.error(errorMessage);
    throw new Error(errorMessage); // Re-throw to halt execution
  } finally {
    console.timeEnd(`monitor-${blocknumber}`);
  }
};