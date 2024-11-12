import { monitorEventsAtBlock } from "~/monitor/getEventsAtBlock";
import { NetworkConfig, ParsedEvent } from "~/monitor/interfaces";
import { addEventToRSS } from "~/rss/rss";

export const processBlockRange = async (config: NetworkConfig, startBlock: number) => {
  const currentBlock = await config.provider.getBlockNumber();
  console.log(`Processing blocks from ${startBlock} to ${currentBlock}`);

  for (let blockNumber = startBlock; blockNumber <= currentBlock; blockNumber++) {
    console.log(`Processing block ${blockNumber}`);
    
    try {
      const events = await monitorEventsAtBlock(blockNumber, config.provider, config.eventsMapping);
      
      if (Object.keys(events).length > 0) {
        Object.entries(events).forEach(([eventName, eventList]) => {
          (eventList as any[]).forEach((event: ParsedEvent) => {
            addEventToRSS(
              event.address,
              event.eventName, 
              event.topics,
              event.title,
              event.description,
              event.link,
              config.networkName,
              config.chainId,
              event.blocknumber,
              config.governanceName,
              event.proposalLink,
            );
          });
        });
      }
    } catch (error) {
      console.error(`Error processing block ${blockNumber}:`, error);
      // Continue with next block even if one fails
    }

    // Small delay between blocks to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('Finished processing block range');
};
