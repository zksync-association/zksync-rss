import RSS, { ItemOptions } from "rss";
import { ethers } from "ethers";
import { uploadToGCS, GCS_BUCKET_NAME, GCS_RSS_PATH, GCS_ARCHIVE_PATH, ARCHIVE_ITEM_THRESHOLD } from "~/shared";
import { Storage } from '@google-cloud/storage';
import Parser from 'rss-parser';
import fs from 'fs';
import path from 'path';

const CONFIG = {
  filePaths: {
    data: path.join(__dirname, '../data/rss-feed.json'),
    output: path.join(__dirname, '../data/feed.xml')
  },
  feed: {
    title: "ZKsync Governance Feed",
    description: "Monitor onchain ZKsync governance events",
    feed_url: "https://feed.zkNation.io/rss.xml",
    site_url: "https://feed.zkNation.io",
    language: 'en',
    managingEditor: 'admin@serotonindesigns.com',
    webMaster: 'admin@serotonindesigns.com',
    copyright: 'ZK Sync team',
    pubDate: new Date(),
  }
};

interface RSSWithItems extends RSS {
  items: ItemOptions[];
}

interface ParsedItem extends Parser.Item {
  contentSnippet?: string;
  description?: string;
  link?: string;
  creator?: string;
  author?: string;
  categories?: string[];
  isoDate?: string;
  pubDate?: string;
  id?: string;
}

class RSSFeedManager {
  private feed: RSS;
  private static instance: RSSFeedManager;
  private initialized = false;
  private seenGuids = new Set<string>();

  private constructor() {
    this.feed = new RSS(CONFIG.feed);
  }

  static getInstance(): RSSFeedManager {
    if (!RSSFeedManager.instance) {
      RSSFeedManager.instance = new RSSFeedManager();
    }
    return RSSFeedManager.instance;
  }

  async initialize() {
    if (!this.initialized) {
      await this.downloadExistingFeed();
      this.initialized = true;
    }
  }

  async downloadExistingFeed() {
    try {
      const storage = new Storage();
      const bucket = storage.bucket(GCS_BUCKET_NAME);
      
      // Get current feed
      const file = bucket.file(GCS_RSS_PATH);
      if ((await file.exists())[0]) {
        const [content] = await file.download();
        const result = await new Parser().parseString(content.toString());
        result.items?.forEach(item => this.addItemToFeed(item));
      }

      // Get archived items
      const [files] = await bucket.getFiles({ prefix: GCS_ARCHIVE_PATH });
      for (const file of files) {
        const [content] = await file.download();
        const result = await new Parser().parseString(content.toString());
        result.items?.forEach(item => this.addItemToFeed(item));
      }
      
      console.log(`Loaded ${this.seenGuids.size} unique items`);
    } catch (error) {
      console.error('Error downloading feed:', error);
      throw error;
    }
  }

  private addItemToFeed(item: ParsedItem) {
    const guid = item.guid || item.id;
    if (guid && !this.seenGuids.has(guid)) {
      this.seenGuids.add(guid);
      this.feed.item({
        title: item.title || '',
        description: item.content || item.contentSnippet || '',
        url: item.link || '',
        guid: guid,
        categories: item.categories || [],
        author: item.creator || item.author || '',
        date: new Date(item.isoDate || item.pubDate || new Date())
      });
    }
  }

  addEvent(event: {
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
  }) {
    const guid = ethers.keccak256(ethers.toUtf8Bytes(event.title + event.block + event.link));
    
    if (this.seenGuids.has(guid)) {
      console.log(`Skipping duplicate event: ${event.title}`);
      return;
    }

    console.log(`Adding new event: ${event.title}`);
    this.seenGuids.add(guid);
    
    this.feed.item({
      title: event.title,
      url: event.link,
      description: JSON.stringify({
        eventDetails: {
          network: event.networkName,
          chainId: event.chainId,
          block: event.block,
          timestamp: new Date(event.timestamp).toLocaleString()
        },
        governanceInfo: {
          governanceBody: event.govBody,
          eventType: event.eventName,
          contractAddress: event.address,
          proposalLink: event.proposalLink
        },
        eventData: event.eventArgs
      }),
      author: event.govBody,
      categories: event.topics,
      date: new Date(event.timestamp),
      guid,
    });
  }

  async generate(): Promise<RSS> {
    // Create new feed
    const sortedFeed = new RSS(CONFIG.feed);
    
    // Get all items and sort by date (newest first)
    const items = (this.feed as RSSWithItems).items
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Add sorted items to feed
    items.forEach(item => sortedFeed.item(item));
    
    return sortedFeed;
  }

  async upload(feed: RSS): Promise<boolean> {
    try {
        const rssContent = feed.xml();
        fs.mkdirSync(path.dirname(CONFIG.filePaths.output), { recursive: true });
        fs.writeFileSync(CONFIG.filePaths.output, rssContent);
        await uploadToGCS(GCS_BUCKET_NAME, CONFIG.filePaths.output, GCS_RSS_PATH, rssContent);
        
        return true;
    } catch (error) {
        console.error('Failed to upload RSS feed:', error);
        return false;
    }
  }

  async generateAndUpload(): Promise<boolean> {
    try {
        const feed = await this.generate();
        return await this.upload(feed);
    } catch (error) {
        console.error('Failed to generate/upload RSS feed:', error);
        return false;
    }
  }
}

export const addEventToRSS = async (
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
  const manager = RSSFeedManager.getInstance();
  await manager.initialize();
  manager.addEvent({
    address, eventName, topics, title, link, networkName,
    chainId, block, govBody, proposalLink, timestamp, eventArgs
  });
};

export const updateRSSFeed = async () => {
  const manager = RSSFeedManager.getInstance();
  await manager.initialize();
  
  const feed = await manager.generate(); // Items are now sorted newest first
  const items = (feed as RSSWithItems).items;
  
  if (items.length > ARCHIVE_ITEM_THRESHOLD) {
    // Keep newest items in main feed
    const itemsToKeep = items.slice(0, ARCHIVE_ITEM_THRESHOLD);
    // Archive older items
    const itemsToArchive = items.slice(ARCHIVE_ITEM_THRESHOLD);
    
    // Create and upload archive of older items
    const archiveFeed = new RSS(CONFIG.feed);
    itemsToArchive.forEach(item => archiveFeed.item(item));
    await uploadToGCS(
      GCS_BUCKET_NAME,
      CONFIG.filePaths.output,
      `${GCS_ARCHIVE_PATH}/archive-${Date.now()}.xml`,
      archiveFeed.xml()
    );
    
    // Update main feed with newest items
    const newFeed = new RSS(CONFIG.feed);
    itemsToKeep.forEach(item => newFeed.item(item));
    return await manager.upload(newFeed);
  }
  
  return await manager.upload(feed);
};