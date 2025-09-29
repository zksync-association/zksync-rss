import path from 'path';
import { addEventToRSS, updateRSSFeed } from "~/rss/utils";
import {
  convertBigIntToString,
  monitorEventsAtBlock,
  ethereumConfig,
  zkSyncConfig,
  NetworkConfig,
} from "~/shared";
import dotenv from 'dotenv';

// Configuration
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function processSpecificBlocks(networkName: string, blockNumbers: number[]) {
  try {
    console.log(`Processing specific blocks for ${networkName}: ${blockNumbers.join(', ')}`);
    
    // Get network configuration
    let config: NetworkConfig;
    if (networkName.toLowerCase() === 'ethereum') {
      config = ethereumConfig;
    } else if (networkName.toLowerCase() === 'zksync') {
      config = zkSyncConfig;
    } else {
      throw new Error(`Unsupported network: ${networkName}`);
    }

    let foundEvents = false;

    // Process each block
    for (const blockNumber of blockNumbers) {
      console.log(`Processing block ${blockNumber} on ${networkName}`);
      
      try {
        const events = await monitorEventsAtBlock(
          blockNumber,
          config.provider,
          config.eventsMapping
        );

        if (events.length > 0) {
          foundEvents = true;
          events.forEach((event) => {
            addEventToRSS(
              event.address,
              event.eventName,
              event.topics,
              event.title,
              event.link,
              config.networkName,
              config.chainId,
              event.blocknumber,
              config.governanceName,
              event.proposalLink,
              event.timestamp,
              convertBigIntToString(event.args)
            );
          });
          console.log(`Found ${events.length} events at block ${blockNumber}`);
        } else {
          console.log(`No events found at block ${blockNumber}`);
        }
      } catch (error) {
        console.error(`Error processing block ${blockNumber}:`, error);
        // Continue processing other blocks even if one fails
      }
    }

    // Update RSS feed if any events were found
    if (foundEvents) {
      const updated = await updateRSSFeed();
      console.log(updated ? 'RSS feed updated' : 'RSS feed unchanged');
    }

    console.log('Successfully processed all specified blocks');

  } catch (error) {
    console.error('Failed to process blocks:', error);
    process.exit(1);
  }
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