import { generateRssFeed } from '../index';
import fs from 'fs';
import path from 'path';

const RSS_OUTPUT_PATH = path.join(__dirname, '../data/feed.xml');
const RSS_EVENTS_PATH = path.join(__dirname, '../data/rss-feed-events.json');

function generateRss() {
    try {
        console.log('Generating RSS feed...');
        
        // Ensure output directory exists
        const dir = path.dirname(RSS_OUTPUT_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Check if events file exists
        if (!fs.existsSync(RSS_EVENTS_PATH)) {
            console.warn('No RSS events file found. Creating empty RSS feed.');
        } else {
            try {
                // Read and parse the events
                const eventsData = JSON.parse(fs.readFileSync(RSS_EVENTS_PATH, 'utf8'));
                
                if (!Array.isArray(eventsData)) {
                    throw new Error('RSS events data is not in the expected format');
                }

                console.log(`Found ${eventsData.length} events to include in RSS feed`);
            } catch (parseError) {
                console.error('Error parsing RSS events file:', parseError);
                throw parseError;
            }
        }

        // Generate and write RSS feed
        const rssContent = generateRssFeed();
        fs.writeFileSync(RSS_OUTPUT_PATH, rssContent);
        
        console.log(`RSS feed generated successfully at ${RSS_OUTPUT_PATH}`);
    } catch (error) {
        console.error('Failed to generate RSS feed:', error);
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

generateRss();