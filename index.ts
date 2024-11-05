import { ethers } from "ethers";
import { EventsMapping } from "./constants";
import { monitorEventsAtBlock } from "./monitor/getEventsAtBlock";

const zkSyncProvider = ethers.getDefaultProvider('https://mainnet.era.zksync.io');
const ethereumProvider = ethers.getDefaultProvider('https://eth-pokt.nodies.app');

// In-memory array to store detected events
const eventLog: Array<{ network: string, address: string, event: any }> = [];

const monitorAllNetworks = async () => {
  let lastBlockEth = await ethereumProvider.getBlockNumber();
  let lastBlockZKSync = await zkSyncProvider.getBlockNumber();

  // Polling function to check for new blocks
  const checkForNewBlocks = async () => {
    const currentBlockEth = await ethereumProvider.getBlockNumber();
    const currentBlockZKSync = await zkSyncProvider.getBlockNumber();

    if (currentBlockEth > lastBlockEth) {
      lastBlockEth = currentBlockEth;
      await monitorEventsAtBlock(currentBlockEth, ethereumProvider, EventsMapping["Ethereum Mainnet"]);
    }

    if (currentBlockZKSync > lastBlockZKSync) {
      lastBlockZKSync = currentBlockZKSync;
      await monitorEventsAtBlock(currentBlockZKSync, zkSyncProvider, EventsMapping["ZKsync Network"]);
    }
  };

  // Set an interval to check for new blocks for ZKSync every second
  setInterval(checkForNewBlocks, 1000); // Check ZKSync every second (ZK adds blocks once a second, ethereum 15s intervals, scan completes in 75ms on ethereum and 350ms on zk)
};

// Start monitoring
monitorAllNetworks().catch(console.error);

// Export event log for further processing or inspection
export { eventLog };