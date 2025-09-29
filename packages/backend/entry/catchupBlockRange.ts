import "tsconfig-paths/register";
import path from "path";
import dotenv from "dotenv";
import { ethers } from "ethers";
import { monitorEventsInRange } from "../shared/getEventsFromBatch";
import { addEventToRSS, updateRSSFeed } from "../rss/utils";
import {
  EventsMapping,
  GCS_BUCKET_NAME,
  GCS_RSS_PATH
} from "../shared/constants";
import {
  loadExistingFeedSummaries,
  summarizeRangeEvents,
  mergeSummaries
} from "../shared/feedPreview";
import { updateState, updateProcessingHistory } from "./processBlockRange";
import { ProcessingRecord } from "../shared";
import { getGovBodyFromAddress } from "../shared/utils";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

type SupportedNetwork = "ethereum" | "zksync";

interface NetworkRuntimeConfig {
  key: SupportedNetwork;
  displayName: "Ethereum Mainnet" | "ZKsync Network";
  chainId: number;
  envVar: "ETHEREUM_RPC_URL" | "ZKSYNC_RPC_URL";
  defaultFrom: number;
}

const NETWORKS: Record<SupportedNetwork, NetworkRuntimeConfig> = {
  ethereum: {
    key: "ethereum",
    displayName: "Ethereum Mainnet",
    chainId: 1,
    envVar: "ETHEREUM_RPC_URL",
    defaultFrom: 23048076
  },
  zksync: {
    key: "zksync",
    displayName: "ZKsync Network",
    chainId: 324,
    envVar: "ZKSYNC_RPC_URL",
    defaultFrom: 63620650
  }
};

const parseBlockArg = (value: string | undefined, fallback: number): number => {
  if (!value || value === "latest") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value: ${value}`);
  }
  return parsed;
};

async function catchupBlockRange() {
  const [networkArg = "zksync", fromArg, toArg] = process.argv.slice(2);
  const normalizedNetwork = networkArg.toLowerCase() as SupportedNetwork;
  const network = NETWORKS[normalizedNetwork];

  if (!network) {
    throw new Error(`Unsupported network '${networkArg}'. Use 'ethereum' or 'zksync'.`);
  }

  const rpcUrl = process.env[network.envVar];
  if (!rpcUrl) {
    throw new Error(`Missing ${network.envVar}. Set it in packages/backend/.env`);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const fromBlock = parseBlockArg(fromArg, network.defaultFrom);
  const latestBlock = await provider.getBlockNumber();
  const toBlock = Math.min(parseBlockArg(toArg, latestBlock), latestBlock);

  console.log(`🚀 Catch-up for ${network.displayName} from block ${fromBlock} to ${toBlock}`);

  const record: ProcessingRecord = {
    network: network.displayName,
    startBlock: fromBlock,
    endBlock: toBlock,
    timestamp: new Date().toISOString(),
    errors: [],
    eventsFound: 0
  };

  const events = await monitorEventsInRange(
    fromBlock,
    toBlock,
    provider,
    EventsMapping[network.displayName],
    network.displayName,
    network.chainId
  );

  record.eventsFound = events.length;

  if (events.length === 0) {
    console.log("ℹ️ No new events found in the requested range.");
  } else {
    console.log(`✅ Retrieved ${events.length} events. Preparing feed update...`);

    for (const event of events) {
        await addEventToRSS(
          event.address,
          event.eventName,
          event.topics,
          event.title,
          event.link,
        event.networkName,
        Number(event.chainId),
        event.blocknumber,
        getGovBodyFromAddress(event.address),
        event.proposalLink,
          event.timestamp,
          event.args
        );
    }

    const uploaded = await updateRSSFeed();
    console.log(uploaded ? "📤 RSS feed updated on GCS" : "⚠️ RSS feed update skipped due to an error");
  }

  const existingEntries = await loadExistingFeedSummaries();
  const rangeSummaries = summarizeRangeEvents(events);
  const merged = mergeSummaries(existingEntries, rangeSummaries);

  console.log(`📊 Summary:
  - Existing feed entries: ${existingEntries.length}
  - Fresh events processed: ${events.length}
  - Combined unique entries: ${merged.length}
  - Feed bucket/path: ${GCS_BUCKET_NAME}/${GCS_RSS_PATH}
`);

  // Update state/history so processBlockRange picks up from here
  updateState(network.displayName, {
    lastProcessedBlock: toBlock,
    hasError: false,
    lastError: undefined,
    consecutiveFailures: 0,
    retryCount: 0,
    failedSegments: []
  });

  await updateProcessingHistory(record);
}

catchupBlockRange().catch((error) => {
  console.error("❌ Catch-up run failed", error);
  process.exit(1);
});
