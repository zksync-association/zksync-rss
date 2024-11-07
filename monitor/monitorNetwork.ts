
import { monitorEventsAtBlock } from "~/monitor/getEventsAtBlock";
import { NetworkConfig } from "~/monitor/interfaces";
import { addEventToRSS } from "~/rss/rss";

export const serializeEventArgs = (args: any) => {
  return JSON.stringify(args, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value
  , 2);
};

export const monitorNetwork = async (config: NetworkConfig, blockNumber?: number) => {
  const processEvents = async (blockToProcess: number) => {
    const events = await monitorEventsAtBlock(blockToProcess, config.provider, config.eventsMapping);
    
    if (Object.keys(events).length > 0) {
      Object.entries(events).forEach(([eventName, eventList]) => {
        (eventList as any[]).forEach(event => {
          addEventToRSS(
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
            event.proposalLink,
          );
        });
      });
    }
  };

  if (blockNumber) {
    await processEvents(blockNumber);
    return;
  }
  
  let lastBlock = await config.provider.getBlockNumber();

  const checkForNewBlocks = async () => {
    const currentBlock = await config.provider.getBlockNumber();
    if (currentBlock > lastBlock) {
      lastBlock = currentBlock;
      await processEvents(currentBlock);
    }
  };

  setInterval(checkForNewBlocks, config.pollInterval);
};