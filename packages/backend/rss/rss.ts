import RSS from "rss";
import { ethers } from "ethers";
import fs from 'fs';
import path from 'path';

const RSS_FILE_PATH = path.join(__dirname, '../data/rss-feed.json');

// Ensure directory exists
const ensureDirectoryExists = (filePath: string) => {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
};

const feedOptions: RSS.FeedOptions = {
    title: "ZKsync Governance Feed",
    description: "Monitor onchain ZKsync governance events",
    feed_url: "https://feed.zkNation.io/rss.xml",
    site_url: "https://feed.zkNation.io",
    language: 'en',
    managingEditor: 'admin@serotonindesigns.com',
    webMaster: 'admin@serotonindesigns.com',
    copyright: 'ZK Sync team',
    pubDate: new Date(),
};

// Load existing feed items if they exist
const loadExistingFeed = (): RSS => {
  ensureDirectoryExists(RSS_FILE_PATH);
  const feed = new RSS(feedOptions);
  
  if (fs.existsSync(RSS_FILE_PATH)) {
    try {
      const savedItems = JSON.parse(fs.readFileSync(RSS_FILE_PATH, 'utf-8'));
      // Sort items by date in descending order (newest first)
      const sortedItems = savedItems.sort((a: RSS.ItemOptions, b: RSS.ItemOptions) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });
      sortedItems.forEach((item: RSS.ItemOptions) => {
        feed.item(item);
      });
    } catch (error) {
      console.error('Error loading RSS feed:', error);
    }
  }
  return feed;
};

// Create/load an instance of the RSS feed
export const feed = loadExistingFeed();

// Helper function to create unique ID
const createUniqueID = (description: string) => {
  return ethers.keccak256(ethers.toUtf8Bytes(description));
};

// Function to save feed items to file
const saveFeedToFile = () => {
  ensureDirectoryExists(RSS_FILE_PATH);
  const items = (feed as any).items.map((item: any) => ({
    title: item.title,
    description: item.description,
    url: item.url,
    guid: item.guid,
    categories: item.categories,
    author: item.author,
    date: item.date
  }));
  
  fs.writeFileSync(RSS_FILE_PATH, JSON.stringify(items, null, 2));
};

// Function to format and add an event as an RSS item
export const addEventToRSS = (
  address: string, 
  eventName: string, 
  topics: string[], 
  title: string, 
  link: string, 
  networkName: string, 
  chainId: number, 
  block: number, 
  govBody: string, 
  proposalLink: string | null, 
  timestamp: string,
  eventArgs: Record<string, unknown>
) => {
  const guid = createUniqueID(title + block + link);

  const formattedDescription = `
    <h3>Event Details</h3>
    <ul>
      <li><strong>Network:</strong> ${networkName}</li>
      <li><strong>Chain ID:</strong> ${chainId}</li>
      <li><strong>Block:</strong> ${block}</li>
      <li><strong>Timestamp:</strong> ${new Date(timestamp).toLocaleString()}</li>
    </ul>

    <h3>Governance Info</h3>
    <ul>
      <li><strong>Governance Body:</strong> ${govBody}</li>
      <li><strong>Event Type:</strong> ${eventName}</li>
      <li><strong>Contract Address:</strong> ${address}</li>
      ${proposalLink ? `<li><strong>Proposal Link:</strong> <a href="${proposalLink}">View Proposal</a></li>` : ''}
    </ul>

    <h3>Event Data</h3>
    <pre>${JSON.stringify(eventArgs, null, 2)}</pre>`;

  const newItem: RSS.ItemOptions = {
    title,
    url: link,
    description: formattedDescription,
    author: govBody,
    categories: topics,
    date: new Date(timestamp),
    guid,
  };

  feed.item(newItem);
  saveFeedToFile();
};