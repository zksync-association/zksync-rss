import path from 'path';
import { addEventToRSS, updateRSSFeed } from "../rss/utils";
import { ethereumConfig, zkSyncConfig } from "../shared/constants";
import dotenv from 'dotenv';
import { convertBigIntToString } from "../shared/utils";
import { monitorEventsAtBlock } from "../shared/getEventsAtBlock";

// Configuration
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function processSpecificBlocks(networkName: string, blockNumbers: number[]) {
  console.log(`Starting to process blocks for network ${networkName}: ${blockNumbers.join(', ')}`);

  const config = networkName === 'ethereum' ? ethereumConfig : zkSyncConfig;
  const provider = config.provider;
  console.log('Provider initialized');

  let foundEvents = false;

  // Process each block
  for (const blockNumber of blockNumbers) {
    console.log(`Processing block ${blockNumber}`);

    const block = await provider.getBlock(blockNumber);
    if (!block) {
      console.log(`Block ${blockNumber} not found`);
      continue;
    }
    console.log(`Block timestamp: ${block.timestamp}`);

    const events = await monitorEventsAtBlock(
      blockNumber,
      provider,
      config.eventsMapping,
      config.networkName,
      config.chainId
    );
    console.log(`Found ${events.length} events in block ${blockNumber}`);

    if (events.length > 0) {
      foundEvents = true;
      console.log(`Found ${events.length} events:`);
      for (const event of events) {
        console.log(`Processing event: ${event.eventName} at ${event.address}`);
        await addEventToRSS(
          event.address,
          event.eventName,
          event.topics,
          event.title,
          event.link,
          event.networkName,
          Number(event.chainId),
          blockNumber,
          config.governanceName,
          event.proposalLink || null,
          event.timestamp,
          convertBigIntToString(event.args)
        );
        console.log(`Event ${event.eventName} added to RSS feed`);
      }
    } else {
      console.log('No events found');
    }
  }

  // Update RSS feed if any events were found
  if (foundEvents) {
    const updated = await updateRSSFeed();
    console.log(updated ? 'RSS feed updated' : 'RSS feed unchanged');
  }

  console.log('All blocks processed, updating RSS feed');
  await updateRSSFeed();
  console.log('RSS feed updated successfully');
}

// Error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

// Handle CLI arguments if script is called directly
if (require.main === module) {
  const network = process.argv[2];
  const blocks = process.argv.slice(3).map(Number);

  if (!network || blocks.length === 0) {
    console.error('Usage: npm run process-specific-blocks <network> <blockNumber1> <blockNumber2> ...');
    console.error('Example: npm run process-specific-blocks ethereum 17791410 17791411 17791412');
    process.exit(1);
  }

  processSpecificBlocks(network, blocks);
}

export { processSpecificBlocks };
