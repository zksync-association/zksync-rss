import { ethers } from "ethers";
import { EventsMapping } from "./constants";
import { monitorEventsAtBlock } from "./monitor/getEventsAtBlock";
import express from "express";
import { feed, addEventToRSS } from "./rss/rss";

const zkSyncProvider = ethers.getDefaultProvider('https://mainnet.era.zksync.io');
const ethereumProvider = ethers.getDefaultProvider('https://eth-pokt.nodies.app');

const serializeEventArgs = (args: any) => {
  return JSON.stringify(args, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value
  , 2);
};

const monitorAllNetworks = async () => {
  let lastBlockEth = await ethereumProvider.getBlockNumber();
  let lastBlockZKSync = await zkSyncProvider.getBlockNumber();

  // Polling function to check for new blocks
  const checkForNewBlocks = async () => {
    const currentBlockEth = await ethereumProvider.getBlockNumber();
    const currentBlockZKSync = await zkSyncProvider.getBlockNumber();

    if (currentBlockEth > lastBlockEth) {
      lastBlockEth = currentBlockEth;
      const events = await monitorEventsAtBlock(currentBlockEth, ethereumProvider, EventsMapping["Ethereum Mainnet"]);
      
      // Process Ethereum events
      if (Object.keys(events).length > 0) {
        Object.entries(events).forEach(([eventName, eventList]) => {
          (eventList as any[]).forEach(event => {
            addEventToRSS({
              eventName,
              link: `https://etherscan.io/tx/${event.txhash}`,
              description:  serializeEventArgs(event.args)
            }, 
            "Ethereum Mainnet",
            1, // Ethereum Chain ID
            event.blocknumber,
            "Ethereum Governance",
            null // Add proposal link if available
            );
          });
        });
      }
    }

    if (currentBlockZKSync > lastBlockZKSync) {
      lastBlockZKSync = currentBlockZKSync;
      const events = await monitorEventsAtBlock(currentBlockZKSync, zkSyncProvider, EventsMapping["ZKsync Network"]);
      
      // Process ZKSync events
      if (Object.keys(events).length > 0) {
        Object.entries(events).forEach(([eventName, eventList]) => {
          (eventList as any[]).forEach(event => {
            addEventToRSS({
              eventName,
              link: `https://explorer.zksync.io/tx/${event.txhash}`,
              description: serializeEventArgs(event.args)
            },
            "ZKSync Era",
            324, // ZKSync Chain ID
            event.blocknumber,
            "ZKSync Governance",
            null // Add proposal link if available
            );
          });
        });
      }
    }
  };

  setInterval(checkForNewBlocks, 1000); // Check ZKSync every second (ZK adds blocks once a second, ethereum 15s intervals, scan completes in 75ms on ethereum and 350ms on zk)
};

// Create an Express application
const app = express();
const PORT = process.env.PORT || 3000;

const startServer = () => {
  // Endpoint to serve the RSS feed
  app.get('/rss', (req, res) => {
      const rssXML = feed.xml({ indent: true });
      res.set('Content-Type', 'application/rss+xml');
      res.send(rssXML);
  });

  // Start the server and then begin monitoring
  app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      // Start blockchain monitoring after server is running
      monitorAllNetworks().catch(error => {
          console.error('Blockchain monitoring error:', error);
          // You might want to implement a restart mechanism here
      });
  });
};

startServer();