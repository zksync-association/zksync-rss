import { ethers } from "ethers";
import { NetworkConfig } from "./interfaces";
import { monitorEventsAtBlock } from "./getEventsAtBlock";
import { addEventToRSS } from "~/rss/rss";

interface BlockAddress {
  address: string;
  blocks: number[];
}

export const processSpecificBlocks = async (config: NetworkConfig) => {
  // Define the specific blocks and addresses to check
  const addressBlocks: BlockAddress[] = [
    {
      address: "0x3E21c654B545Bf6236DC08236169DcF13dA4dDd6",
      blocks: [49089754, 48849940, 41197322, 41197320, 41197318, 41197315, 41197308]
    },
    {
      address: "0x10560f8B7eE37571AD7E3702EEb12Bc422036E89",
      blocks: [48849940, 49089754]
    },
    {
      address: "0x76705327e682F2d96943280D99464Ab61219e34f",
      blocks: [49077771, 49079668, 49254234]
    },
    {
      address: "0x3701fB675bCd4A85eb11A2467628BBe193F6e6A8",
      blocks: [41196846]
    },
    {
      address: "0xC3e970cB015B5FC36edDf293D2370ef5D00F7a19",
      blocks: [41197426, 41197433, 41197435, 41197437, 41197439]
    },
    {
      address: "0x10560f8B7eE37571AD7E3702EEb12Bc422036E89",
      blocks: [41197311]
    },
    {
      address: "0x496869a7575A1f907D1C5B1eca28e4e9E382afAb",
      blocks: [41197430]
    },
    {
      address: "0x76705327e682F2d96943280D99464Ab61219e34f",
      blocks: [41196850]
    },
    {
      address: "0x3E21c654B545Bf6236DC08236169DcF13dA4dDd6",
      blocks: [41197308]
    }
  ];

  

  for (const { address, blocks } of addressBlocks) {
    console.log(`Processing events for address ${address}`);
    
    // Create a specific config for this address
    const addressConfig = {
      [address]: config.eventsMapping[address] || []
    };

    // Process each block for this address
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
          
          // Process each event
          for (const event of events) {
            await addEventToRSS(
              event.address,
              event.eventName,
              event.topics,
              event.title,
              event.description,
              event.link,
              config.networkName,
              config.chainId,
              event.blocknumber,
              config.governanceName,
              event.proposalLink
            );
          }
        }
      } catch (error) {
        console.error(`Error processing block ${blockNumber} for address ${address}:`, error);
      }

      // Add a small delay between requests to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('Finished processing specific blocks');
};