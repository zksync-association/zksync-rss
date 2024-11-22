import { startNetworkMonitoring } from '../index';

async function startMonitor() {
    try {
        console.log('Starting network monitoring...');
        await startNetworkMonitoring();
    } catch (error) {
        console.error('Failed to start monitoring:', error);
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

startMonitor();