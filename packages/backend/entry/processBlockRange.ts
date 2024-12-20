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

async function downloadStateFile() {
  try {
    await downloadFromGCS(GCS_BUCKET_NAME, GCS_STATE_FILE_PATH, STATE_FILE_PATH);
    console.log('State file downloaded successfully');
  } catch (error) {
    console.warn('Failed to download state file from GCS, starting fresh:', error);
  }
}

async function uploadStateFile() {
  try {
    await uploadToGCS(GCS_BUCKET_NAME, STATE_FILE_PATH, GCS_STATE_FILE_PATH);
    console.log('State file uploaded successfully');
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
  const batches = [];

  for (let currentBlock = startBlock; currentBlock <= endBlock; currentBlock += batchSize) {
    const batchEnd = Math.min(currentBlock + batchSize - 1, endBlock);
    const batchPromises = [];
    
    for (let blockNumber = currentBlock; blockNumber <= batchEnd; blockNumber++) {
      batchPromises.push(monitorEventsAtBlock(
        blockNumber,
        config.provider,
        config.eventsMapping
      ));
    }
    
    batches.push(Promise.all(batchPromises));
  }

  for (const batch of batches) {
    const batchEvents = await batch;
    const events = batchEvents.flat();
    
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
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return foundEvents;
}

async function processLatestBlocks() {
  try {
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
      ethereum: {
        lastProcessedBlock: ethereumCurrentBlock - 100,
        hasError: false,
        lastUpdated: new Date().toISOString()
      },
      zksync: {
        lastProcessedBlock: zksyncCurrentBlock - 100,
        hasError: false,
        lastUpdated: new Date().toISOString()
      }
    };
    
    if (fs.existsSync(STATE_FILE_PATH)) {
      try {
        const fileContent = fs.readFileSync(STATE_FILE_PATH, 'utf8');
        console.log('State file content:', fileContent);
        stateData = JSON.parse(fileContent);
      } catch (error) {
        console.error('Error parsing state file:', error);
      }
    }

    const ethereumStartBlock = (stateData["Ethereum Mainnet"]?.lastProcessedBlock ?? ethereumCurrentBlock - 100) + 1;
    const zksyncStartBlock = (stateData["ZKSync"]?.lastProcessedBlock ?? zksyncCurrentBlock - 100) + 1;

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

    await uploadStateFile();

    if (ethereumFoundEvents || zksyncFoundEvents) {
      const updated = await updateRSSFeed();
      console.log(updated ? 'RSS feed updated' : 'RSS feed unchanged');
    }

    console.log('Successfully processed all blocks');

  } catch (error) {
    console.error('Failed to process latest blocks:', error);
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