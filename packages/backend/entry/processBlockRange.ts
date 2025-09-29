import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { addEventToRSS, updateRSSFeed } from "~/rss/utils";
import {
  EventsMapping,
  NetworkConfig,
  downloadFromGCS,
  uploadToGCS,
  GCS_BUCKET_NAME,
  GCS_STATE_FILE_PATH,
  GCS_HISTORY_FILE_PATH,
  ProcessingHistory,
  ProcessingRecord
} from "~/shared";
import dotenv from "dotenv";
import { monitorEventsInRange } from "~/shared/getEventsFromBatch";
import { ParsedEvent } from "~/shared/types";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Segment = {
  from: number;
  to: number;
  attempt: number;
};
interface ProcessingState {
  lastProcessedBlock: number;
  hasError: boolean;
  lastError?: string;
  lastUpdated: string;
  retryCount?: number;
  consecutiveFailures?: number;
  skippedBatches?: number[];
  apiCallCount?: number;
  failedSegments?: { from: number; to: number; error: string }[];
}

// Configuration
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const STATE_FILE_PATH = path.join(__dirname, "../data/processing-state.json");
const API_CALL_DELAY = 100; // Delay between API calls to prevent rate limiting
const RETRY_DELAY_BASE = 5000; // Base delay for exponential backoff when retrying segments
const MAX_SEGMENT_ATTEMPTS = 3; // Maximum retries per segment before giving up
const MIN_SEGMENT_SPAN = 10; // Minimum block span before we stop splitting further
const LOCK_FILE_PATH = path.join(__dirname, "../data/processing-history.lock");
const ARCHIVE_THRESHOLD = 1000;
const MIN_TIME_BETWEEN_ARCHIVES = 10 * 60 * 1000; // 10 minutes
const RSS_LOCK_FILE_PATH = path.join(__dirname, "../data/rss-feed.lock");

export async function downloadStateFile() {
  try {
    const dir = path.dirname(STATE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await downloadFromGCS(GCS_BUCKET_NAME, GCS_STATE_FILE_PATH, STATE_FILE_PATH);
    console.log("State file downloaded successfully");
  } catch (error) {
    console.warn("Failed to download state file from GCS, starting fresh:", error);
  }
}

export async function uploadStateFile() {
  try {
    if (!fs.existsSync(STATE_FILE_PATH)) {
      console.error("State file does not exist for upload");
      return;
    }
    const content = fs.readFileSync(STATE_FILE_PATH, "utf-8");
    await uploadToGCS(GCS_BUCKET_NAME, STATE_FILE_PATH, GCS_STATE_FILE_PATH, content);
    console.log("State file uploaded successfully");
    fs.unlinkSync(STATE_FILE_PATH);
    console.log("Local state file cleaned up");
  } catch (error) {
    console.error("Failed to upload state file to GCS:", error);
  }
}

export async function acquireLock(timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function tryLock() {
      fs.writeFile(LOCK_FILE_PATH, process.pid.toString(), { flag: "wx" }, (err) => {
        if (!err) return resolve();
        if (Date.now() - start > timeout) return reject(new Error("Could not acquire lock"));
        setTimeout(tryLock, 100);
      });
    }
    tryLock();
  });
}

export async function releaseLock(): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.unlink(LOCK_FILE_PATH, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export async function acquireRSSLock(timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function tryLock() {
      fs.writeFile(RSS_LOCK_FILE_PATH, process.pid.toString(), { flag: "wx" }, (err) => {
        if (!err) return resolve();
        if (Date.now() - start > timeout) return reject(new Error("Could not acquire RSS lock"));
        setTimeout(tryLock, 100);
      });
    }
    tryLock();
  });
}

export async function releaseRSSLock(): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.unlink(RSS_LOCK_FILE_PATH, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function collectEventsWithAdaptiveRange(
  config: NetworkConfig,
  startBlock: number,
  endBlock: number,
  record: ProcessingRecord
): Promise<{ events: ParsedEvent[]; apiCalls: number; failedSegments: { from: number; to: number; error: string }[] }> {
  if (startBlock > endBlock) {
    return { events: [], apiCalls: 0, failedSegments: [] };
  }

  const segments: Segment[] = [{ from: startBlock, to: endBlock, attempt: 0 }];
  const collected: ParsedEvent[] = [];
  let apiCalls = 0;
  const failedSegments: { from: number; to: number; error: string }[] = [];

  while (segments.length > 0) {
    const segment = segments.shift();
    if (!segment) {
      break;
    }

    if (segment.from > segment.to) {
      continue;
    }

    try {
      console.log(`🔍 Fetching ${config.networkName} range ${segment.from}-${segment.to}`);
      const events = await monitorEventsInRange(
        segment.from,
        segment.to,
        config.provider,
        config.eventsMapping,
        config.networkName,
        config.chainId
      );
      apiCalls++;
      collected.push(...events);
    } catch (error) {
      const span = segment.to - segment.from;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️ Failed fetching ${config.networkName} range ${segment.from}-${segment.to}: ${errorMessage}`);

      if (span > MIN_SEGMENT_SPAN) {
        const mid = Math.floor((segment.from + segment.to) / 2);

        if (mid > segment.from && mid < segment.to) {
          console.log(`➗ Splitting ${config.networkName} range ${segment.from}-${segment.to} at ${mid}`);
          segments.unshift(
            { from: segment.from, to: mid, attempt: 0 },
            { from: mid + 1, to: segment.to, attempt: 0 }
          );
          await sleep(API_CALL_DELAY);
          continue;
        }
      }

      if (segment.attempt + 1 <= MAX_SEGMENT_ATTEMPTS) {
        const delay = RETRY_DELAY_BASE * (segment.attempt + 1);
        console.log(`⏳ Retrying ${config.networkName} range ${segment.from}-${segment.to} in ${delay}ms (attempt ${segment.attempt + 1}/${MAX_SEGMENT_ATTEMPTS})`);
        await sleep(delay);
        segments.unshift({ ...segment, attempt: segment.attempt + 1 });
        continue;
      }

      const failure = {
        from: segment.from,
        to: segment.to,
        error: errorMessage
      };
      record.errors.push({
        block: segment.from,
        timestamp: new Date().toISOString(),
        error: `Failed to fetch range ${segment.from}-${segment.to}: ${errorMessage}`
      });
      failedSegments.push(failure);
      console.error(`🚫 Giving up on ${config.networkName} range ${segment.from}-${segment.to} after ${segment.attempt + 1} attempts. Will skip for now.`);
      continue;
    }

    if (segments.length > 0) {
      await sleep(API_CALL_DELAY);
    }
  }

  collected.sort((a, b) => {
    if (a.blocknumber !== b.blocknumber) {
      return a.blocknumber - b.blocknumber;
    }
    return a.txhash.localeCompare(b.txhash);
  });

  return { events: collected, apiCalls, failedSegments };
}

/**
 * Processes a range of blocks in batches using the new batched log query.
 */
export async function processBlockRangeForNetwork(
  config: NetworkConfig,
  startBlock: number,
  endBlock: number,
  skipStateUpdate = false,
  options: { updateFeed?: boolean } = {}
) {
  console.log(`Processing ${config.networkName} blocks ${startBlock} to ${endBlock}`);

  const record: ProcessingRecord = {
    network: config.networkName,
    startBlock,
    endBlock,
    timestamp: new Date().toISOString(),
    errors: [],
    eventsFound: 0
  };

  try {
    const { events, apiCalls, failedSegments } = await collectEventsWithAdaptiveRange(config, startBlock, endBlock, record);
    const foundEvents = events.length > 0;
    record.eventsFound = events.length;

    if (failedSegments.length > 0) {
      console.warn(`⚠️ Skipped ${failedSegments.length} segments for ${config.networkName}. See state file for details.`);
    }

    if (!skipStateUpdate) {
      updateState(config.networkName, {
        lastProcessedBlock: endBlock,
        hasError: failedSegments.length > 0,
        lastError: failedSegments[0]?.error,
        consecutiveFailures: failedSegments.length,
        apiCallCount: apiCalls,
        failedSegments: failedSegments
      });
    }

    if (!skipStateUpdate) {
      await updateProcessingHistory(record);
    }

    console.log(`Completed processing ${config.networkName}: API calls ${apiCalls}, events ${events.length}, errors ${record.errors.length}`);

    if (foundEvents && options.updateFeed !== false) {
      await acquireRSSLock();
      console.log("Acquired RSS lock for feed update");
      try {
        for (const event of events) {
          await addEventToRSS(
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
            event.args
          );
        }

        const updated = await updateRSSFeed();
        console.log(updated ? "RSS feed updated" : "RSS feed unchanged");
      } finally {
        await releaseRSSLock();
        console.log("Released RSS lock");
      }
    }

    return foundEvents;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed processing ${config.networkName} blocks ${startBlock}-${endBlock}:`, error);

    if (record.errors.length === 0) {
      record.errors.push({
        block: startBlock,
        timestamp: new Date().toISOString(),
        error: message
      });
    }

    if (!skipStateUpdate) {
      updateState(config.networkName, {
        hasError: true,
        lastError: message,
        consecutiveFailures: (record.errors?.length ?? 0),
      });
    }

    if (!skipStateUpdate) {
      try {
        await updateProcessingHistory(record);
      } catch (historyError) {
        console.error("Failed to update processing history after error:", historyError);
      }
    }

    throw error;
  }
}

export function updateState(network: string, state: Partial<ProcessingState>) {
  const dir = path.dirname(STATE_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  let allStates: Record<string, ProcessingState> = {};
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      allStates = JSON.parse(fs.readFileSync(STATE_FILE_PATH, "utf8"));
    }
  } catch (error) {
    console.warn("Error reading state file, starting fresh:", error);
  }

  const existing = allStates[network];
  let mergedFailedSegments: { from: number; to: number; error: string }[] | undefined;

  if (state.failedSegments !== undefined) {
    if (state.failedSegments.length === 0) {
      mergedFailedSegments = [];
    } else if (existing?.failedSegments?.length) {
      const combined = [...existing.failedSegments, ...state.failedSegments];
      const unique = new Map<string, { from: number; to: number; error: string }>();
      for (const item of combined) {
        const key = `${item.from}-${item.to}`;
        if (!unique.has(key)) {
          unique.set(key, item);
        }
      }
      mergedFailedSegments = Array.from(unique.values());
    } else {
      mergedFailedSegments = [...state.failedSegments];
    }
  } else {
    mergedFailedSegments = existing?.failedSegments;
  }

  allStates[network] = {
    ...existing,
    ...state,
    failedSegments: mergedFailedSegments,
    lastUpdated: new Date().toISOString()
  };
  fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(allStates, null, 2));
  console.log(`Updated state for ${network}:`, allStates[network]);
}

export async function processLatestBlocks() {
  try {
    await downloadStateFile();

    const ethereumProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL, { chainId: 1, name: "mainnet" });
    const zksyncProvider = new ethers.JsonRpcProvider(process.env.ZKSYNC_RPC_URL, { chainId: 324, name: "zksync-era" });

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

    if (fs.existsSync(STATE_FILE_PATH)) {
      try {
        const fileContent = fs.readFileSync(STATE_FILE_PATH, "utf8");
        console.log("State file content:", fileContent);
        stateData = JSON.parse(fileContent);
        Object.entries(stateData).forEach(([networkName, state]) => {
          if (state.failedSegments?.length) {
            console.warn(`⚠️ Pending failed segments for ${networkName}:`, state.failedSegments);
          }
        });
      } catch (error) {
        console.error("Error parsing state file:", error);
      }
    } else {
      fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(stateData, null, 2));
      console.log("Created initial state file");
    }

    const ethereumStartBlock = (stateData["Ethereum Mainnet"]?.lastProcessedBlock ?? ethereumCurrentBlock - 100) + 1;
    const zksyncStartBlock = (stateData["ZKSync"]?.lastProcessedBlock ?? zksyncCurrentBlock - 100) + 1;

    // Process both networks in parallel
    await Promise.all([
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

    if (!fs.existsSync(STATE_FILE_PATH)) {
      console.error("State file missing before upload");
      fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(stateData, null, 2));
    }
    await uploadStateFile();

    const dataDir = path.join(__dirname, "../data");
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      if (files.length === 0) {
        fs.rmdirSync(dataDir);
        console.log("Empty data directory cleaned up");
      }
    }
    console.log("Successfully processed all blocks");
  } catch (error) {
    console.error("Failed to process latest blocks:", error);
    try {
      if (fs.existsSync(STATE_FILE_PATH)) {
        await uploadStateFile();
      }
    } catch (uploadError) {
      console.error("Failed to upload state file after error:", uploadError);
    }
    process.exit(1);
  }
}

export async function updateProcessingHistory(newRecord: ProcessingRecord) {
  const tempPath = path.join(__dirname, "../data/processing-history.json");
  const dir = path.dirname(tempPath);
  try {
    await acquireLock();
    console.log("Acquired lock for processing history update");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    let history: ProcessingHistory;
    try {
      await downloadFromGCS(GCS_BUCKET_NAME, GCS_HISTORY_FILE_PATH, tempPath);
      history = JSON.parse(fs.readFileSync(tempPath, "utf8"));
      console.log(`Loaded history with ${history.records.length} records`);
    } catch (error) {
      console.log("No existing history found, starting fresh");
      history = { records: [], lastArchiveTimestamp: null };
    }
    history.records.push(newRecord);
    console.log(`Added new record, total records: ${history.records.length}`);
    const now = Date.now();
    const lastArchiveTime = history.lastArchiveTimestamp ? new Date(history.lastArchiveTimestamp).getTime() : 0;
    const shouldArchive =
      history.records.length >= ARCHIVE_THRESHOLD &&
      (!history.lastArchiveTimestamp || now - lastArchiveTime >= MIN_TIME_BETWEEN_ARCHIVES);
    if (shouldArchive) {
      console.log("Archiving records...");
      const archivePath = `state/archive/processing-history-${Date.now()}.json`;
      const recordsToArchive = history.records.slice(0, history.records.length - 100);
      await uploadToGCS(
        GCS_BUCKET_NAME,
        tempPath,
        archivePath,
        JSON.stringify(recordsToArchive)
      );
      history.records = history.records.slice(-100);
      history.lastArchiveTimestamp = new Date().toISOString();
      history.archivedRecords = [
        ...(history.archivedRecords || []),
        { path: archivePath, count: recordsToArchive.length, timestamp: new Date().toISOString() }
      ];
      console.log(`Archived ${recordsToArchive.length} records, keeping ${history.records.length} records`);
    }
    fs.writeFileSync(tempPath, JSON.stringify(history, null, 2));
    await uploadToGCS(GCS_BUCKET_NAME, tempPath, GCS_HISTORY_FILE_PATH);
    console.log("Uploaded updated history to GCS");
    fs.unlinkSync(tempPath);
    await releaseLock();
    console.log("Released lock");
  } catch (error) {
    console.error("Failed to update processing history:", error);
    try {
      if (fs.existsSync(LOCK_FILE_PATH)) {
        await releaseLock();
        console.log("Released lock after error");
      }
    } catch (releaseError) {
      console.error("Failed to release lock:", releaseError);
    }
    throw error;
  }
}

/**
 * Processes specific block ranges for testing or targeted processing.
 * This function provides a clean interface for the test file to use.
 */
export async function processSpecificBlockRanges(
  networkName: "Ethereum Mainnet" | "ZKSync",
  startBlock: number,
  endBlock: number,
  options: {
    skipStateUpdate?: boolean;
    updateFeed?: boolean;
  } = {}
): Promise<boolean> {
  try {
    // Set up providers based on network
    const provider = networkName === "Ethereum Mainnet" 
      ? new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL, { chainId: 1, name: "mainnet" })
      : new ethers.JsonRpcProvider(process.env.ZKSYNC_RPC_URL, { chainId: 324, name: "zksync-era" });
    
    // Prepare network config
    const config: NetworkConfig = {
      provider,
      eventsMapping: EventsMapping[networkName === "Ethereum Mainnet" ? "Ethereum Mainnet" : "ZKsync Network"],
      networkName,
      chainId: networkName === "Ethereum Mainnet" ? 1 : 324,
      blockExplorerUrl: networkName === "Ethereum Mainnet" ? "https://etherscan.io" : "https://explorer.zksync.io",
      governanceName: networkName === "Ethereum Mainnet" ? "Ethereum Governance" : "ZKSync Governance",
      pollInterval: 1000
    };
    
    // Process the block range
    const foundEvents = await processBlockRangeForNetwork(
      config,
      startBlock,
      endBlock,
      options.skipStateUpdate,
      { updateFeed: options.updateFeed }
    );
    
    return foundEvents;
  } catch (error) {
    console.error(`Failed to process specific block range for ${networkName}:`, error);
    throw error;
  }
}

// Error handlers
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
  process.exit(1);
});

// Only run the process if this file is being executed directly (not imported)
if (require.main === module) {
  processLatestBlocks();
}
