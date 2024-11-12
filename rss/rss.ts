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
      savedItems.forEach((item: RSS.ItemOptions) => {
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
export const addEventToRSS = (address: string, eventName: string, topics: string[], title: string, description: string, link: string, networkName: string, chainID: number, block: number, govBody: string, proposalLink: string | null) => {

  const guid = createUniqueID(title + description);

  const newItem: RSS.ItemOptions = {
      title,
      url: link,
      description: `
          <strong>Network:</strong> ${networkName}<br />
          <strong>Address:</strong> ${address}<br />
          <strong>Chain ID:</strong> ${chainID}<br />
          <strong>Block:</strong> ${block}<br />
          <strong>Governance Body:</strong> ${govBody}<br />
          <strong>Event Type:</strong> ${eventName}<br />
          ${proposalLink ? `<strong>Proposal Link:</strong> <a href="${proposalLink}">${proposalLink}</a><br />` : ""}
          <pre>${description}</pre>
      `,
      author: govBody,
      categories: topics,
      date: new Date(),
      guid,
  };

  feed.item(newItem);
  saveFeedToFile(); // Save after each new item
}