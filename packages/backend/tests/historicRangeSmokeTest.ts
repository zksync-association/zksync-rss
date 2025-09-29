import "tsconfig-paths/register";
import { ethers } from "ethers";
import { monitorEventsInRange } from "../shared/getEventsFromBatch";
import { EventsMapping } from "../shared/constants";
import {
  loadExistingFeedSummaries,
  summarizeRangeEvents,
  mergeSummaries,
  writeMergedFeedPreview
} from "../shared/feedPreview";

interface NetworkInput {
  key: "ethereum" | "zksync";
  displayName: "Ethereum Mainnet" | "ZKsync Network";
  chainId: number;
  envVar: "ETHEREUM_RPC_URL" | "ZKSYNC_RPC_URL";
  defaultFrom: number;
}

const NETWORKS: Record<string, NetworkInput> = {
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

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value || value === "latest") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value: ${value}`);
  }
  return parsed;
};

async function run() {
  const [networkArg = "ethereum", fromArg, toArg] = process.argv.slice(2);
  const network = NETWORKS[networkArg.toLowerCase()];

  if (!network) {
    throw new Error(`Unsupported network '${networkArg}'. Use 'ethereum' or 'zksync'.`);
  }

  const rpcUrl = process.env[network.envVar];
  if (!rpcUrl) {
    throw new Error(`Missing ${network.envVar}. Point this env var at your Alchemy endpoint.`);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const fromBlock = parseNumber(fromArg, network.defaultFrom);
  const latestBlock = await provider.getBlockNumber();
  const toBlock = Math.min(parseNumber(toArg, latestBlock), latestBlock);

  console.log(`🔎 Fetching ${network.displayName} logs from block ${fromBlock} to ${toBlock}`);

  const events = await monitorEventsInRange(
    fromBlock,
    toBlock,
    provider,
    EventsMapping[network.displayName],
    network.displayName,
    network.chainId
  );

  console.log(`✅ Retrieved ${events.length} events for ${network.displayName}`);

  const existingFeedEntries = await loadExistingFeedSummaries();
  console.log(`📦 Loaded ${existingFeedEntries.length} existing feed entries from GCS`);

  const rangeSummaries = summarizeRangeEvents(events);
  const merged = mergeSummaries(existingFeedEntries, rangeSummaries);

  console.log(`📊 Combined event list (${merged.length} unique entries):`);
  console.table(
    merged.map(item => ({
      guid: item.guid,
      title: item.title,
      network: item.network,
      block: item.block ?? "-",
      txhash: item.txhash ?? "-",
      timestamp: item.timestamp,
      source: item.source
    }))
  );

  const previewPath = writeMergedFeedPreview(merged);
  console.log(`📝 Wrote merged feed preview to ${previewPath}`);
}

run().catch((error) => {
  console.error("❌ historic range check failed", error);
  process.exit(1);
});
