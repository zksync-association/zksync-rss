import { ethers } from "ethers";
import { EventsMapping } from "./constants";
import { monitorEventsAtBlock } from "./monitor/getEventsAtBlock";

const zkSyncProvider = ethers.getDefaultProvider('https://mainnet.era.zksync.io');
const ethereumProvider = ethers.getDefaultProvider('https://eth-pokt.nodies.app');

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

  setInterval(checkForNewBlocks, 1000); // Check ZKSync every second (ZK adds blocks once a second, ethereum 15s intervals, scan completes in 75ms on ethereum and 350ms on zk)
};

// Start monitoring
monitorAllNetworks().catch(console.error);
