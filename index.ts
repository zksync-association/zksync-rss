import { ethers } from "ethers";
import { EventsMapping, UnifiedMinimalABI, ContractAddresses } from "./constants"


const zkSyncProvider = ethers.getDefaultProvider('https://zksync-mainnet.g.alchemy.com/v2/oo31x_W2PF8koBxWmkuxGq6aj7egkHDH');

const ethereumProvider = ethers.getDefaultProvider('mainnet', {
  alchemy: process.env.ALCHEMY_API_KEY,
  exclusive: ["alchemy"]
});


// In-memory array to store detected events
const eventLog: Array<{ network: string, address: string, event: any }> = [];

// Function to initialize contract instances
const initializeContracts = (provider: ethers.Provider, addresses: string[]) => {
  const contracts: { [address: string]: ethers.Contract } = {};
  for (const address of addresses) {
      contracts[address] = new ethers.Contract(address, UnifiedMinimalABI, provider);
  }
  return contracts;
};

// Initialize contract instances for both networks
const ethereumContracts = initializeContracts(ethereumProvider, ContractAddresses["Ethereum Mainnet"]);
const zkSyncContracts = initializeContracts(zkSyncProvider, ContractAddresses["ZKsync Network"]);

// Function to monitor events for a single contract
const monitorEvents = async (networkName: string, contracts: { [address: string]: ethers.Contract }) => {
  for (const [address, contract] of Object.entries(contracts)) {
      contract.on("*", async (...args) => {
          const event = args[args.length - 1];  // Get event data
          console.log(`New event detected on ${networkName} - Contract: ${address}`);
          eventLog.push({ network: networkName, address, event });
          console.log('events', eventLog)
      });
  }
};

// Function to monitor all networks in parallel
const monitorAllNetworks = async () => {
  console.log("Starting event monitoring for Ethereum Mainnet and ZKSync Network...");
  await Promise.all([
      monitorEvents("Ethereum Mainnet", ethereumContracts),
      monitorEvents("ZKsync Network", zkSyncContracts)
  ]);
};

// Export event log for further processing or inspection
export { eventLog };

// Start monitoring
monitorAllNetworks().catch(console.error);

