import { ethers } from "ethers";
import fs from 'fs';
import path from 'path';
import { addEventToRSS, updateRSSFeed } from "~/rss/utils";
import {
  convertBigIntToString,
  EventsMapping,
  NetworkConfig,
  downloadFromGCS,
  uploadToGCS,
  monitorEventsAtBlock,
  GCS_BUCKET_NAME,
  GCS_STATE_FILE_PATH
} from "~/shared";
import dotenv from 'dotenv';

interface ProcessingState {
  lastProcessedBlock: number;
  hasError: boolean;
  lastError?: string;
  lastUpdated: string;
}

// Configuration
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const STATE_FILE_PATH = path.join(__dirname, '../data/processing-state.json');
const BATCH_SIZE = 10;
const BATCH_DELAY = 1000;

async function downloadStateFile() {
  try {
    // Create data directory if it doesn't exist
    const dir = path.dirname(STATE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await downloadFromGCS(GCS_BUCKET_NAME, GCS_STATE_FILE_PATH, STATE_FILE_PATH);
    console.log('State file downloaded successfully');
  } catch (error) {
    console.warn('Failed to download state file from GCS, starting fresh:', error);
    // Don't initialize the file here - let the main process handle it
  }
}

async function uploadStateFile() {
  try {
    if (!fs.existsSync(STATE_FILE_PATH)) {
      console.error('State file does not exist for upload');
      return;
    }
    
    const content = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
    await uploadToGCS(GCS_BUCKET_NAME, STATE_FILE_PATH, GCS_STATE_FILE_PATH, content);
    console.log('State file uploaded successfully');
    
    // Clean up local state file after successful upload
    fs.unlinkSync(STATE_FILE_PATH);
    console.log('Local state file cleaned up');
  } catch (error) {
    console.error('Failed to upload state file to GCS:', error);
  }
}

async function processBlockRangeForNetwork(
  config: NetworkConfig,
  startBlock: number,
  endBlock: number,
  batchSize: number = BATCH_SIZE
) {
  console.log(`Processing ${config.networkName} blocks ${startBlock} to ${endBlock}`);
  let foundEvents = false;
    for (let currentBlock = startBlock; currentBlock <= endBlock; currentBlock += batchSize) {
      const batchEnd = Math.min(currentBlock + batchSize - 1, endBlock);
      console.log(`Processing ${config.networkName} batch: ${currentBlock} to ${batchEnd}`);

      for (let blockNumber = currentBlock; blockNumber <= batchEnd; blockNumber++) {
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
        }

        updateState(config.networkName, {
          lastProcessedBlock: blockNumber,
          hasError: false,
          lastError: undefined
        });    
      } catch (error) {
        console.error(`Error processing ${config.networkName} block ${blockNumber}:`, error);
        updateState(config.networkName, {
          lastProcessedBlock: blockNumber - 1,
          hasError: true,
          lastError: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Delay between batches
    if (batchEnd < endBlock) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
  }
  return foundEvents;
}

function updateState(network: string, state: Partial<ProcessingState>) {
  const dir = path.dirname(STATE_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let allStates: Record<string, ProcessingState> = {};
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      allStates = JSON.parse(fs.readFileSync(STATE_FILE_PATH, 'utf8'));
    }
  } catch (error) {
    console.warn('Error reading state file, starting fresh:', error);
  }

  allStates[network] = {
    ...allStates[network],
    ...state,
    lastUpdated: new Date().toISOString()
  };

  // Write the updated state file
  fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(allStates, null, 2));
  console.log(`Updated state for ${network}:`, allStates[network]);
}

async function processLatestBlocks() {
  try {
    // Download state file at start
    await downloadStateFile();

    const ethereumProvider = new ethers.JsonRpcProvider(
      process.env.ETHEREUM_RPC_URL,
      { chainId: 1, name: 'mainnet' }
    );
    const zksyncProvider = new ethers.JsonRpcProvider(
      process.env.ZKSYNC_RPC_URL,
      { chainId: 324, name: 'zksync-era' }
    );

    const [ethereumCurrentBlock, zksyncCurrentBlock] = await Promise.all([
      ethereumProvider.getBlockNumber(),
      zksyncProvider.getBlockNumber()
    ]);

    let stateData: Record<string, ProcessingState> = {
      "Ethereum Mainnet": {
        lastProcessedBlock: ethereumCurrentBlock - 100,
        hasError: false,
        lastUpdated: new Date().toISOString()
      },
      "ZKSync": {
        lastProcessedBlock: zksyncCurrentBlock - 100,
        hasError: false,
        lastUpdated: new Date().toISOString()
      }
    };
    
    // Load existing state if available
    if (fs.existsSync(STATE_FILE_PATH)) {
      try {
        const fileContent = fs.readFileSync(STATE_FILE_PATH, 'utf8');
        console.log('State file content:', fileContent);
        stateData = JSON.parse(fileContent);
      } catch (error) {
        console.error('Error parsing state file:', error);
      }
    } else {
      // Write initial state if we don't have a state file
      fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(stateData, null, 2));
      console.log('Created initial state file');
    }

    const ethereumStartBlock = (stateData["Ethereum Mainnet"]?.lastProcessedBlock ?? ethereumCurrentBlock - 100) + 1;
    const zksyncStartBlock = (stateData["ZKSync"]?.lastProcessedBlock ?? zksyncCurrentBlock - 100) + 1;

    // Process blocks for both networks
    const [ethereumFoundEvents, zksyncFoundEvents] = await Promise.all([
      processBlockRangeForNetwork(
        {
          provider: ethereumProvider,
          eventsMapping: EventsMapping["Ethereum Mainnet"],
          networkName: "Ethereum Mainnet",
          chainId: 1,
          blockExplorerUrl: "https://etherscan.io",
          governanceName: "Ethereum Governance",
          pollInterval: 1000
        },
        ethereumStartBlock,
        ethereumCurrentBlock
      ),
      processBlockRangeForNetwork(
        {
          provider: zksyncProvider,
          eventsMapping: EventsMapping["ZKsync Network"],
          networkName: "ZKSync",
          chainId: 324,
          blockExplorerUrl: "https://explorer.zksync.io",
          governanceName: "ZKSync Governance",
          pollInterval: 1000
        },
        zksyncStartBlock,
        zksyncCurrentBlock
      )
    ]);

    // Ensure state file exists before upload
    if (!fs.existsSync(STATE_FILE_PATH)) {
      console.error('State file missing before upload');
      // Re-write state file if it's missing
      fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(stateData, null, 2));
    }

    // Upload state file after processing
    await uploadStateFile();

    // Process RSS feed if needed
    if (ethereumFoundEvents || zksyncFoundEvents) {
      const updated = await updateRSSFeed();
      console.log(updated ? 'RSS feed updated' : 'RSS feed unchanged');
    }

    // Clean up the data directory if it's empty
    const dataDir = path.join(__dirname, '../data');
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      if (files.length === 0) {
        fs.rmdirSync(dataDir);
        console.log('Empty data directory cleaned up');
      }
    }

    console.log('Successfully processed all blocks');

  } catch (error) {
    console.error('Failed to process latest blocks:', error);
    // Try to save state file even if there's an error
    try {
      if (fs.existsSync(STATE_FILE_PATH)) {
        await uploadStateFile();
      }
    } catch (uploadError) {
      console.error('Failed to upload state file after error:', uploadError);
    }
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

// Run the process
processLatestBlocks();