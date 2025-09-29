import { ethers } from "ethers";
import { UnifiedMinimalABI, ParsedEvent, getCategory, getGovBodyFromAddress } from "~/shared";

export const monitorEventsAtBlock = async (
  blocknumber: number,
  provider: ethers.Provider,
  contractsConfig: { [address: string]: string[] },
  networkName: string, // Added networkName
  chainId: number      // Added chainId
): Promise<ParsedEvent[]> => {
  try {
    const block = await provider.getBlock(blocknumber);
    if (!block) {
      throw new Error(`Block ${blocknumber} not found`);
    }
    if (!block.timestamp) {
      throw new Error(`Block ${blocknumber} has no timestamp`);
    }

    // Validate timestamp
    const timestamp = Number(block.timestamp);
    const now = Math.floor(Date.now() / 1000);
    const isFutureTimestamp = timestamp > now;

    if (isFutureTimestamp) {
      console.warn(`Block ${blocknumber} has a future timestamp: ${timestamp} (${new Date(timestamp * 1000).toISOString()}). Using current time instead.`);
    }

    const allEventPromises = Object.entries(contractsConfig).flatMap(([address, events]) => {
      const contract = new ethers.Contract(address, UnifiedMinimalABI, provider);

      const eventLogsPromises = events.map(eventName =>
        contract.queryFilter(eventName, blocknumber, blocknumber)
          .then(eventLogs => {
            return eventLogs.map(log => {
              const eventFragment = contract.interface.getEvent(eventName);
              if (!eventFragment) {
                throw new Error(`Failed to get event fragment for ${eventName} on ${address}`);
              }

              try {
                const decodedData = contract.interface.decodeEventLog(
                  eventFragment,
                  log.data,
                  log.topics
                );

                const args: Record<string, unknown> = {};
                eventFragment.inputs.forEach((input, index) => {
                  args[input.name] = decodedData[index];
                });

                return {
                  eventName,
                  txhash: log.transactionHash,
                  blocknumber: log.blockNumber,
                  address: log.address,
                  topics: log.topics,
                  interface: eventFragment,
                  args,
                  rawData: log.data,
                  decodedData
                };
              } catch (decodeError) {
                throw new Error(`Failed to decode event ${eventName} on ${address}: ${(decodeError as unknown as Error).message}`);
              }
            });
          })
          .catch((err) => {
            const errorMessage = `Error processing event at block ${blocknumber}, contract ${address}, event ${eventName}: ${err.message}`;
            throw new Error(errorMessage);
          })
      );
      return eventLogsPromises;
    });

    const results = await Promise.all(allEventPromises);

    const organizedEvents = results.flatMap((result) => {
      if (!result) {
        throw new Error(`Received null result when processing events at block ${blocknumber}`);
      }

      return result.filter(e => e != undefined).map(event => {
        if (!event?.interface) {
          throw new Error(`Invalid event data at block ${blocknumber}`);
        }

        // Determine block explorer link based on networkName
        const blockExplorerBaseUrl = networkName === 'Ethereum Mainnet' ? 'https://etherscan.io' : 'https://explorer.zksync.io';
        const link = `${blockExplorerBaseUrl}/tx/${event.txhash}`;

        // Use current time if block timestamp is in the future
        const eventTimestamp = isFutureTimestamp ? now : timestamp;

        // Construct proposal link using the provided chainId
        const proposalLink = event.args.proposalId ?
          `https://vote.zknation.io/dao/proposal/${event.args.proposalId}?govId=eip155:${chainId}:${event.address}` : '';

        return {
          interface: event.interface,
          rawData: event.rawData,
          decodedData: event.decodedData,
          title: `${event.eventName} - ${getGovBodyFromAddress(event.address)}`,
          link,
          txhash: event.txhash,
          eventName: event.eventName,
          blocknumber: event.blocknumber,
          address: event.address,
          args: event.args,
          topics: [getCategory(event.address)],
          timestamp: String(eventTimestamp),
          proposalLink,
          networkName, // Use passed-in networkName
          chainId: String(chainId), // Use passed-in chainId, converting to string
        };
      });
    });

    return organizedEvents;
  } catch (err: unknown) {
    const errorMessage = `Error processing block ${blocknumber}: ${(err as Error).message}`;
    throw new Error(errorMessage);
  }
};
