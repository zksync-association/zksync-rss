import { ethers } from "ethers";
import { EventsMapping } from "./constants";
import { monitorEventsAtBlock } from "./monitor/getEventsAtBlock";
import express from "express";
import { feed, addEventToRSS } from "./rss/rss";
import { spawn } from 'child_process';

const RESTART_DELAY = 5000; // 5 seconds

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


const startServerWithRestart = () => {
  const startServer = () => {
    const app = express();
    const PORT = process.env.PORT || 3000;

    // Endpoint to serve the RSS feed
    app.get('/rss', (req, res) => {
        const rssXML = feed.xml({ indent: true });
        res.set('Content-Type', 'application/rss+xml');
        res.send(rssXML);
    });

    // Add health check endpoint
    app.get('/health', (req, res) => {
        res.status(200).json({ status: 'healthy' });
    });

    // Error handling middleware
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
        console.error('Server error:', err);
        res.status(500).send('Internal Server Error');
    });

    // Start the server and then begin monitoring
    const server = app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
        
        // Start blockchain monitoring after server is running
        monitorAllNetworks().catch(error => {
            console.error('Blockchain monitoring error:', error);
            // Crash the process so it can be restarted
            process.exit(1);
        });
    });

    // Handle server errors
    server.on('error', (error) => {
        console.error('Server error:', error);
        process.exit(1);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        console.error('Uncaught exception:', error);
        process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (error) => {
        console.error('Unhandled rejection:', error);
        process.exit(1);
    });
};

    try {
        startServer();
    } catch (error) {
        console.error('Server crashed:', error);
        console.log(`Restarting server in ${RESTART_DELAY/1000} seconds...`);
        setTimeout(startServerWithRestart, RESTART_DELAY);
    }
};

// Initial start
startServerWithRestart();

// For production deployment, you might want to use a process manager
if (process.env.NODE_ENV === 'production') {
    const restartScript = () => {
        const child = spawn(process.argv[0], process.argv.slice(1), {
            detached: true,
            stdio: 'inherit'
        });

        child.on('exit', (code) => {
            console.log(`Process exited with code ${code}`);
            console.log('Restarting...');
            setTimeout(restartScript, RESTART_DELAY);
        });
    };

    // Handle SIGTERM for graceful shutdown
    process.on('SIGTERM', () => {
        console.log('Received SIGTERM. Performing graceful shutdown...');
        // Add any cleanup logic here
        process.exit(0);
    });
}