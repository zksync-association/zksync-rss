import { ethers } from "ethers";
import { getGovBodyFromAddress, UnifiedMinimalABI, EventsMapping } from "~/constants";
import { ParsedEvent } from "./interfaces";

function getCategory(eventName: string): string {
  if (!eventName) return "Unknown";

  // Define mappings of keywords to categories
  const categories = {
    "Protocol": ["Proposal Submitted", "Vote Delay", "Voting Period", "Met Quorum", "Vote Period Expiring", "Queued", "Executed", "Vetoed"],
    "Token": ["Token Assembly", "Increase Staking Rewards"],
    "GovOps": ["Governance", "Security Council", "Token Assembly"],
    "Emergency Upgrade": ["Emergency Upgrade", "Upgrade Board"],
    "Freeze": ["Soft Freeze", "Hard Freeze"],
    "Message": ["LateQuorumVoteExtensionSet", "Message"]
  };

  // Search for matching keywords in the event name
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => eventName.includes(keyword))) {
      return category;
    }
  }

  // Default category if no match is found
  return "Other";
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
              console.log(event, 'here', event?.interface.inputs);
              if (!event) return;
    
              if (!acc[event.eventName]) {
                acc[event.eventName] = [] as ParsedEvent[];
              }
              
              // Construct the RSS feed item
              acc[event.eventName].push({
                title: `${event.eventName} - ${getGovBodyFromAddress(event.address)}`,
                link: event.address.toLowerCase() in EventsMapping["Ethereum Mainnet"] ? 
                  `https://etherscan.io/tx/${event.txhash}` :
                  `https://explorer.zksync.io/tx/${event.txhash}`,
                txhash: event.txhash,
                eventName: event.eventName,
                blocknumber: event.blocknumber,
                address: event.address,
                interface: event.interface,
                args: event.args,
                rawData: event.rawData,
                decodedData: event.decodedData,
                description: `
                  <![CDATA[
                    <strong>Network:</strong> ${event.address.toLowerCase() in EventsMapping["Ethereum Mainnet"] ? 'Ethereum Mainnet' : 'ZKsync Era'}<br />
                    <strong>Chain ID:</strong> ${event.address.toLowerCase() in EventsMapping["Ethereum Mainnet"] ? '1' : '324'}<br />
                    <strong>Block:</strong> ${event.blocknumber}<br />
                    <strong>Governance Body:</strong> ${getGovBodyFromAddress(event.address) || 'Guardians'}<br />
                    <strong>Event Type:</strong> ${event.eventName}<br />
                    <strong>Address:</strong> ${event.address}<br />
                    <strong>Event:</strong> ${event.eventName}<br />
                    <pre>${JSON.stringify(event.args, (_, value) =>
                      typeof value === 'bigint' ? value.toString() : value
                    , 2)}
                    </pre>
                  ]]>
                `,
                topics: [getCategory(event.eventName)],
                timestamp: new Date().toISOString(),
                proposalLink: event.args.proposalId ? JSON.stringify(event.args.proposalId, (_, value) =>
                  typeof value === 'bigint' ? value.toString() : value
                , 2) : '',
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
