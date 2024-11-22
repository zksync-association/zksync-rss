import { ethers } from "ethers";
import dotenv from 'dotenv';
import { NetworkConfig } from "~/monitor/interfaces";
import { EventsMapping } from "~/constants";
import { monitorNetwork } from "./monitor/monitorNetwork";
import { feed } from "~/rss/rss";

dotenv.config();

const zkSyncProvider = ethers.getDefaultProvider(process.env.ZKSYNC_RPC_URL || 'https://mainnet.era.zksync.io');
const ethereumProvider = ethers.getDefaultProvider(process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com');

const ethereumConfig: NetworkConfig = {
  provider: ethereumProvider,
  eventsMapping: EventsMapping["Ethereum Mainnet"],
  networkName: "Ethereum Mainnet",
  chainId: 1,
  blockExplorerUrl: "https://etherscan.io",
  governanceName: "Ethereum Governance",
  pollInterval: 15000
};

const zkSyncConfig: NetworkConfig = {
  provider: zkSyncProvider,
  eventsMapping: EventsMapping["ZKsync Network"],
  networkName: "ZKSync",
  chainId: 324,
  blockExplorerUrl: "https://explorer.zksync.io",
  governanceName: "ZKSync Governance",
  pollInterval: 1000
};

// Separate entry point for RSS feed generation
export const generateRssFeed = (): string => {
  return feed.xml({ indent: true });
};

// Separate entry point for network monitoring
export const startNetworkMonitoring = async () => {
  try {
    await Promise.all([
      monitorNetwork(ethereumConfig),
      monitorNetwork(zkSyncConfig)
    ]);
  } catch (error) {
    console.error('Monitoring error:', error);
    throw error;
  }
};

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

// Handle SIGTERM for graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Performing graceful shutdown...');
  process.exit(0);
});