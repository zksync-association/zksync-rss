import { ethers } from "ethers";
import dotenv from 'dotenv';
import express from "express";
import { spawn } from 'child_process';

import { monitorNetwork } from "./monitor/monitorNetwork";
import { NetworkConfig } from "~/monitor/interfaces";
import { EventsMapping } from "~/constants";
import { feed } from "~/rss/rss";
import { processSpecificBlocks } from "./monitor/processSpecificBlocks";

const RESTART_DELAY = 5000; // 5 seconds

dotenv.config();

const zkSyncProvider = ethers.getDefaultProvider(process.env.ZKSYNC_RPC_PROVIDER_URL || 'https://mainnet.era.zksync.io');
const ethereumProvider = ethers.getDefaultProvider(process.env.ETH_MAINNET_RPC_PROVIDER_URL || 'https://eth-pokt.nodies.app');

const ethereumConfig: NetworkConfig = {
  provider: ethereumProvider,
  eventsMapping: EventsMapping["Ethereum Mainnet"],
  networkName: "Ethereum Mainnet",
  chainId: 1,
  blockExplorerUrl: "https://etherscan.io",
  governanceName: "Ethereum Governance",
  pollInterval: 15000
};

const zkSyncConfig: NetworkConfig = {
  provider: zkSyncProvider,
  eventsMapping: EventsMapping["ZKsync Network"],
  networkName: "ZKSync",
  chainId: 324,
  blockExplorerUrl: "https://explorer.zksync.io",
  governanceName: "ZKSync Governance",
  pollInterval: 1000
};


const startServerWithRestart = () => {
  const startServer = () => {
    const app = express();
    const PORT = process.env.PORT || 3001;

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
    const server = app.listen(PORT, async () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      // await Promise.all([
      //   monitorNetwork(ethereumConfig).catch(error => {
      //     console.error('ethereum monitoring error:', error);
      //     process.exit(1);
      //   }),
      //   monitorNetwork(zkSyncConfig).catch(error => {
      //     console.error('zksync monitoring error:', error);
      //     process.exit(1);
      //   })
      // ])
      processSpecificBlocks(zkSyncConfig);
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