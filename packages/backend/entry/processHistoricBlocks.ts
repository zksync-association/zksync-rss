import { ethers } from 'ethers';
import { convertBigIntToString, EventsMapping } from "../constants";
import { NetworkConfig } from "../monitor/interfaces";
import { monitorEventsAtBlock } from "../monitor/getEventsAtBlock";
import { addEventToRSS } from "../rss/rss";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

interface BlockAddress {
  address: string;
  blocks: number[];
}

async function processAddressBlocks(addressBlocks: BlockAddress[], config: NetworkConfig) {
  for (const { address, blocks } of addressBlocks) {
    console.log(`Processing events for address ${address}`);
    
    const addressConfig = {
      [address]: config.eventsMapping[address] || []
    };

    for (const blockNumber of blocks) {
      try {
        console.log(`Checking block ${blockNumber} for address ${address}`);
        
        const events = await monitorEventsAtBlock(
          blockNumber,
          config.provider,
          addressConfig
        );

        if (events.length > 0) {
          console.log(`Found ${events.length} events at block ${blockNumber}`);
          
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
              convertBigIntToString(event.args)
            );
          }
        }
      } catch (error) {
        console.error(`Error processing block ${blockNumber} for address ${address}:`, error);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

async function main() {
  try {
    const ethereumProvider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    const zksyncProvider = new ethers.JsonRpcProvider(process.env.ZKSYNC_RPC_URL);

    const zkSyncAddressBlocks: BlockAddress[] = [
      {address: "0x3E21c654B545Bf6236DC08236169DcF13dA4dDd6", blocks: [49089754, 48849940, 41197322, 41197320, 41197318, 41197315, 41197308]},
      {address: "0x10560f8B7eE37571AD7E3702EEb12Bc422036E89", blocks: [48849940, 49089754]},
      {address: "0x76705327e682F2d96943280D99464Ab61219e34f", blocks: [49077771, 49079668, 49254234]},
      {address: "0x3701fB675bCd4A85eb11A2467628BBe193F6e6A8", blocks: [41196846]},
      {address: "0xC3e970cB015B5FC36edDf293D2370ef5D00F7a19", blocks: [41197426, 41197433, 41197435, 41197437, 41197439]},
      {address: "0x10560f8B7eE37571AD7E3702EEb12Bc422036E89", blocks: [41197311]},
      {address: "0x496869a7575A1f907D1C5B1eca28e4e9E382afAb", blocks: [41197430]},
      {address: "0x76705327e682F2d96943280D99464Ab61219e34f", blocks: [41196850]},
      {address: "0x3E21c654B545Bf6236DC08236169DcF13dA4dDd6", blocks: [41197308]}
    ];

    const ethereumAddressBlocks: BlockAddress[] = [
      { address: "0x8f7a9912416e8AdC4D9c21FAe1415D3318A11897", blocks: [20486023, 20732809] }
    ];

    await Promise.all([
      processAddressBlocks(zkSyncAddressBlocks, {
        provider: zksyncProvider,
        eventsMapping: EventsMapping["ZKsync Network"],
        networkName: "ZKSync",
        chainId: 324,
        blockExplorerUrl: "https://explorer.zksync.io",
        governanceName: "ZKSync Governance",
        pollInterval: 1000
      }),
      processAddressBlocks(ethereumAddressBlocks, {
        provider: ethereumProvider,
        eventsMapping: EventsMapping["Ethereum Mainnet"],
        networkName: "Ethereum Mainnet",
        chainId: 1,
        blockExplorerUrl: "https://etherscan.io",
        governanceName: "Ethereum Governance",
        pollInterval: 1000
      })
    ]);

    console.log('Finished processing specific blocks');
  } catch (error) {
    console.error('Failed to process blocks:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

main();