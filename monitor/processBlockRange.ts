import { monitorEventsAtBlock } from "~/monitor/getEventsAtBlock";
import { NetworkConfig, ParsedEvent } from "~/monitor/interfaces";
import { addEventToRSS } from "~/rss/rss";

const BATCH_SIZE = 1; // Adjust based on your needs and rate limits

export const processBlockRange = async (config: NetworkConfig, startBlock: number) => {
  const currentBlock = await config.provider.getBlockNumber();
  console.log(`Processing blocks from ${startBlock} to ${currentBlock}`);
  
  // Create batches of block numbers
  const blocks = [];
  for (let i = startBlock; i <= currentBlock; i++) {
    blocks.push(i);
  }

  // Process blocks in batches
  for (let i = 0; i < blocks.length; i += BATCH_SIZE) {
    const batch = blocks.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${i/BATCH_SIZE + 1}, blocks ${batch[0]} to ${batch[batch.length-1]}`);
    
    try {
      // Process batch of blocks in parallel
      await Promise.all(batch.map(async (blockNumber) => {
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
      }));
    } catch (error) {
      console.error(`Error processing batch at block ${batch[0]}:`, error);
      // Continue with next batch even if one fails
    }

    // Optional: Add a small delay between batches to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('Finished processing block range');
};

