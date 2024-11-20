
import { convertBigIntToString } from "~/constants";
import { monitorEventsAtBlock } from "~/monitor/getEventsAtBlock";
import { NetworkConfig } from "~/monitor/interfaces";
import { addEventToRSS } from "~/rss/rss";

export const serializeEventArgs = <T extends Record<string, unknown>>(args: T): string => {
  return JSON.stringify(args, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value
  , 2);
};

export const monitorNetwork = async (config: NetworkConfig, blockNumber?: number) => {
  const processEvents = async (blockToProcess: number) => {
    const events = await monitorEventsAtBlock(blockToProcess, config.provider, config.eventsMapping);
    
    if (events.length > 0) {
      events.forEach((event) => {

        const eventData = {
          address: event.address,
          eventName: event.eventName, 
          topics: event.topics,
          title: event.title,
          link: event.link,
          networkName: config.networkName, 
          chainId: config.chainId,
          blockNumber: event.blocknumber,
          category: event.topics[0],
          proposalLink: event.proposalLink,
          timestamp: event.timestamp,
          eventArgs: convertBigIntToString(event.args)
        };
  
        return addEventToRSS(
          eventData.address,
          eventData.eventName,
          eventData.topics,
          eventData.title,
          eventData.link,
          eventData.networkName,
          eventData.chainId,
          eventData.blockNumber,
          eventData.category,
          eventData.proposalLink,
          eventData.timestamp,
          eventData.eventArgs
        );
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
