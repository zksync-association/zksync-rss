import { ethers } from "ethers";
import fs from 'fs';
import path from 'path';
import { NetworkConfig } from "~/monitor/interfaces";
import { monitorEventsAtBlock } from "~/monitor/getEventsAtBlock";
import { addEventToRSS } from "~/rss/rss";
import { convertBigIntToString, EventsMapping } from "../constants";
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

async function processBlockRangeForNetwork(
  config: NetworkConfig,
  startBlock: number,
  endBlock: number,
  batchSize: number = BATCH_SIZE
) {
  console.log(`Processing ${config.networkName} blocks ${startBlock} to ${endBlock}`);

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

  fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(allStates, null, 2));
}

async function processLatestBlocks() {
  try {
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

    let stateData: Record<string, ProcessingState> = {};
    if (fs.existsSync(STATE_FILE_PATH)) {
      stateData = JSON.parse(fs.readFileSync(STATE_FILE_PATH, 'utf8'));
    }

    const ethereumStartBlock = (stateData.ethereum?.lastProcessedBlock ?? ethereumCurrentBlock - 100) + 1;
    const zksyncStartBlock = (stateData.zksync?.lastProcessedBlock ?? zksyncCurrentBlock - 100) + 1;

    // Process both networks
    await Promise.all([
      processBlockRangeForNetwork(
        {
          provider: ethereumProvider,
          eventsMapping: EventsMapping["Ethereum Mainnet"],
          networkName: "Ethereum Mainnet",
          chainId: 1,
          blockExplorerUrl: "https://etherscan.io",
          governanceName: "Ethereum Governance",
          pollInterval: 1000  // Add this line
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
          pollInterval: 1000  // Add this line
        },
        zksyncStartBlock,
        zksyncCurrentBlock
      )
    ]);

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