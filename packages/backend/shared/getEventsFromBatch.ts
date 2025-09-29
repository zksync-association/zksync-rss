import { ethers } from "ethers";
import { UnifiedMinimalABI, ParsedEvent, getCategory, getGovBodyFromAddress } from "~/shared";
import { getBlockCache } from "./blockCache";

/**
 * Queries logs for multiple contracts and events over a block range.
 */
export const monitorEventsInRange = async (
  fromBlock: number,
  toBlock: number,
  provider: ethers.Provider,
  contractsConfig: { [address: string]: string[] },
  networkName: string,
  chainId: number
): Promise<ParsedEvent[]> => {
  console.time(`monitor-range-${fromBlock}-${toBlock}`);
  const collectedEvents: ParsedEvent[] = [];
  
  // Hoist blockTimestamps cache outside all loops
  const blockTimestamps: Record<number, number> = {};
  
  // Pre-fetch all unique block numbers to reduce API calls
  const uniqueBlocks = new Set<number>();
  
  try {
    // Aggressive optimization: Use single getLogs call for all addresses
    // This reduces multiple API calls to just ONE call
    const allAddresses = Object.keys(contractsConfig);
    const allEventTopics: string[] = [];
    const eventMap = new Map<string, { address: string, eventName: string, contract: ethers.Contract, eventFragment: any }>();

    // Build comprehensive topic list and contract map
    for (const [address, events] of Object.entries(contractsConfig)) {
      const contract = new ethers.Contract(address, UnifiedMinimalABI, provider);
      
      for (const eventName of events) {
        try {
          const eventFragment = contract.interface.getEvent(eventName);
          if (!eventFragment) {
            throw new Error(`🚨 Failed to get event fragment for ${eventName} on ${address}`);
          }

          const topic = ethers.id(eventFragment.format());
          allEventTopics.push(topic);
          eventMap.set(`${address}-${topic}`, { address, eventName, contract, eventFragment });
        } catch (err: unknown) {
          const errorMessage = `🚨 ERROR processing event ${eventName} on contract ${address}`;
          console.error(errorMessage);
          throw new Error(errorMessage);
        }
      }
    }

    // SINGLE API CALL for all contracts and events
    console.log(`🚀 Making single getLogs call for ${allAddresses.length} addresses and ${allEventTopics.length} events`);
    const filter = {
      address: allAddresses,
      topics: [allEventTopics], // OR condition for all event topics
      fromBlock,
      toBlock
    };
    
    const allRawLogs = await provider.getLogs(filter);
    console.log(`📦 Received ${allRawLogs.length} raw logs from single API call`);

    // Parse logs into structured events
    const allLogs: Array<{log: any, contract: ethers.Contract, eventFragment: any, eventName: string, address: string}> = [];
    
    for (const log of allRawLogs) {
      const topic = log.topics[0];
      const eventInfo = eventMap.get(`${log.address}-${topic}`);
      
      if (eventInfo) {
        allLogs.push({
          log,
          contract: eventInfo.contract,
          eventFragment: eventInfo.eventFragment,
          eventName: eventInfo.eventName,
          address: eventInfo.address
        });
        uniqueBlocks.add(log.blockNumber);
      }
    }

    // Use persistent cache to avoid repeated API calls
    const blockCache = getBlockCache(networkName);
    const blockNumbers = Array.from(uniqueBlocks);
    const uncachedBlocks: number[] = [];

    // Check cache first - this eliminates most API calls
    for (const blockNumber of blockNumbers) {
      const cachedTimestamp = blockCache.get(blockNumber);
      if (cachedTimestamp !== null) {
        blockTimestamps[blockNumber] = cachedTimestamp;
      } else {
        uncachedBlocks.push(blockNumber);
      }
    }

    console.log(`Cache hit: ${blockNumbers.length - uncachedBlocks.length}/${blockNumbers.length} blocks. API calls needed: ${uncachedBlocks.length}`);

    // Only fetch uncached blocks with aggressive limits
    if (uncachedBlocks.length > 0) {
      const concurrency = 3; // Very conservative to minimize CU usage
      const delayMs = 200;   // Longer delays between waves

      for (let i = 0; i < uncachedBlocks.length; i += concurrency) {
        const slice = uncachedBlocks.slice(i, i + concurrency);
        await Promise.all(
          slice.map(async (blockNumber) => {
            try {
              const block = await provider.getBlock(blockNumber);
              if (block && block.timestamp) {
                const timestamp = Number(block.timestamp);
                blockTimestamps[blockNumber] = timestamp;
                blockCache.set(blockNumber, timestamp); // Cache for future use
              } else {
                console.warn(`⚠️ Block ${blockNumber} has no timestamp, using current time`);
                const fallback = Math.floor(Date.now() / 1000);
                blockTimestamps[blockNumber] = fallback;
                blockCache.set(blockNumber, fallback);
              }
            } catch (error) {
              console.warn(`⚠️ Failed to get block ${blockNumber}, using current time:`, error);
              const fallback = Math.floor(Date.now() / 1000);
              blockTimestamps[blockNumber] = fallback;
              blockCache.set(blockNumber, fallback);
            }
          })
        );
        if (i + concurrency < uncachedBlocks.length) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
      
      // Save cache after fetching new blocks
      blockCache.flush();
    }

    // Second pass: process all logs with cached timestamps
    for (const {log, contract, eventFragment, eventName, address} of allLogs) {
      const decodedData = contract.interface.decodeEventLog(
        eventFragment,
        log.data,
        log.topics
      );
      
      const args: Record<string, unknown> = {};
      eventFragment.inputs.forEach((input, index) => {
        args[input.name] = decodedData[index];
      });
      
      // Use cached timestamp
      let timestamp = blockTimestamps[log.blockNumber];
      
      // Validate timestamp (ensure it's not in the future)
      const now = Math.floor(Date.now() / 1000);
      const isFutureTimestamp = timestamp > now;
      
      if (isFutureTimestamp) {
        console.warn(`⚠️ Block ${log.blockNumber} has a future timestamp: ${timestamp}, using current time instead`);
        timestamp = now;
      }
      
      // Convert proposalId to string if it exists
      const pid = args.proposalId?.toString();
      const blockExplorerBaseUrl = networkName === 'Ethereum Mainnet' ? 'https://etherscan.io' : 'https://explorer.zksync.io';
      const link = `${blockExplorerBaseUrl}/tx/${log.transactionHash}`;

      const proposalLink = pid
        ? `https://vote.zknation.io/dao/proposal/${pid}?govId=eip155:${chainId}:${address}`
        : "";

      collectedEvents.push({
        interface: eventFragment,
        rawData: log.data,
        decodedData,
        title: `${eventName} - ${getGovBodyFromAddress(address)}`,
        link,
        txhash: log.transactionHash,
        eventName,
        blocknumber: log.blockNumber,
        address,
        args,
        topics: [getCategory(address)],
        timestamp: String(timestamp),
        proposalLink,
        networkName, 
        chainId: String(chainId)
      });
    }
    if (!collectedEvents.length) {
      console.log(`ℹ️ No events found between blocks ${fromBlock} and ${toBlock}`);
    } else {
      console.log(`✅ Successfully processed ${collectedEvents.length} events between blocks ${fromBlock} and ${toBlock}. Block fetches: ${uniqueBlocks.size}`);
    }
    return collectedEvents;
  } catch (err: unknown) {
    console.error(`🚨 FATAL ERROR processing blocks ${fromBlock}-${toBlock}: ${err instanceof Error ? err.message : String(err)}`, err instanceof Error ? err.stack : undefined);
    throw err;
  } finally {
    console.timeEnd(`monitor-range-${fromBlock}-${toBlock}`);
  }
};
