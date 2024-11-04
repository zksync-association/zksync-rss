import { ethers } from "ethers";
import { EventsMapping, UnifiedMinimalABI, ContractAddresses } from "./constants"


const zkSyncProvider = ethers.getDefaultProvider('https://zksync-mainnet.g.alchemy.com/v2/oo31x_W2PF8koBxWmkuxGq6aj7egkHDH');

const ethereumProvider = ethers.getDefaultProvider('https://eth-mainnet.g.alchemy.com/v2/oo31x_W2PF8koBxWmkuxGq6aj7egkHDH');


// In-memory array to store detected events
const eventLog: Array<{ network: string, address: string, event: any }> = [];

// Function to initialize contract instances with specific event listeners
const initializeContracts = (
  provider: ethers.Provider,
  networkName: string,
  contractsConfig: { [address: string]: string[] }
) => {
  const contracts: { [address: string]: ethers.Contract } = {};
  for (const [address, events] of Object.entries(contractsConfig)) {
    const contract = new ethers.Contract(address, UnifiedMinimalABI, provider);

    // Add listeners only for the specified events
    events.forEach(eventName => {
      try {
        contract.on(eventName, (...args) => {
          const event = args[args.length - 1]; // Last argument is the event object
          console.log(`New ${eventName} event detected on ${networkName} - Contract: ${address}`);
          eventLog.push({ network: networkName, address, event });
          console.log(eventLog);
        });
      } catch (e) {
        console.log(e);
      }
      
    });

    contracts[address] = contract;
  }
  return contracts;
};

// Function to monitor all networks (already set up by `initializeContracts`)
const monitorAllNetworks = async () => {
  console.log("Monitoring specified events for Ethereum Mainnet and ZKSync Network...");
  initializeContracts(zkSyncProvider, "ZKsync Network", EventsMapping["ZKsync Network"]);
  initializeContracts(ethereumProvider, "Ethereum Mainnet", EventsMapping["Ethereum Mainnet"]);
};

// Start monitoring
monitorAllNetworks().catch(console.error);

// Export event log for further processing or inspection
export { eventLog };
