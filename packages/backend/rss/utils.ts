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

// Helper function to parse timestamps consistently
function parseEventDate(timestamp: string | number): Date | null {
  if (typeof timestamp === "number") {
    if (isNaN(timestamp)) return null;
    // If it's a unix timestamp (seconds), convert to ms
    return new Date(timestamp > 1e12 ? timestamp : timestamp * 1000);
  }
  if (typeof timestamp === "string") {
    // First try if it's a numeric string representing a Unix timestamp
    const numericTimestamp = Number(timestamp);
    if (!isNaN(numericTimestamp)) {
      // If it's a valid number, treat it as a Unix timestamp
      return new Date(numericTimestamp > 1e12 ? numericTimestamp : numericTimestamp * 1000);
    }
    
    // If it's not a numeric string, try to parse it as a date string
    const parsed = Date.parse(timestamp);
    if (isNaN(parsed)) return null;
    return new Date(parsed);
  }
  return null;
}

// Generate a consistent GUID for events
function getEventGuid(event: {
  networkName: string,
  chainId: number,
  title: string,
  block: number,
  link: string
}): string {
  const normalized = [
    event.networkName.toLowerCase().replace(/\s+/g, ""),
    event.chainId,
    event.title.toLowerCase().replace(/\s+/g, ""),
    event.block,
    event.link.toLowerCase()
  ].join("-");
  return ethers.keccak256(ethers.toUtf8Bytes(normalized));
}

class RSSFeedManager {
  private feed: RSS;
  private static instance: RSSFeedManager;
  private initialized = false;
  private seenGuids = new Set<string>();
  private items: ItemOptions[] = [];  // Single source of truth for items
  private isTestMode = false;

  private constructor() {
    this.feed = new RSS(CONFIG.feed);
  }

  static getInstance(testMode = false): RSSFeedManager {
    if (!RSSFeedManager.instance) {
      RSSFeedManager.instance = new RSSFeedManager();
    }
    RSSFeedManager.instance.isTestMode = testMode;
    return RSSFeedManager.instance;
  }

  async initialize() {
    if (this.initialized) {
      return; // Already initialized
    }
    
    if (!this.isTestMode) {
      await this.downloadExistingFeed();
    } else {
      console.log('🧪 Test mode: Skipping GCS download');
    }
    this.initialized = true;
  }

  async downloadExistingFeed() {
    try {
      const storage = new Storage();
      const bucket = storage.bucket(GCS_BUCKET_NAME);
      
      // Get current feed only
      const file = bucket.file(GCS_RSS_PATH);
      if ((await file.exists())[0]) {
        const [content] = await file.download();
        const result = await new Parser().parseString(content.toString());
        result.items?.forEach(item => this.addItemToFeed(item));
        console.log(`Loaded ${this.seenGuids.size} unique items from main feed`);
      } else {
        console.log('No existing feed found, starting fresh');
      }
    } catch (error) {
      console.error('Error downloading feed:', error);
      throw error;
    }
  }

  private addItemToFeed(item: ParsedItem) {
    const guid = item.guid || item.id;
    if (!guid) return;
    
    if (this.seenGuids.has(guid)) return;
    this.seenGuids.add(guid);
    
    this.items.push({
      title: item.title || '',
      description: item.content || item.contentSnippet || '',
      url: item.link || '',
      guid: guid,
      categories: item.categories || [],
      author: item.creator || item.author || '',
      date: new Date(item.isoDate || item.pubDate || new Date())
    });
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
    timestamp: string | number,
    eventArgs: Record<string, unknown>
  }) {
    // Parse timestamp properly
    console.log(`Processing event: ${event.title}, timestamp: ${event.timestamp} (${typeof event.timestamp})`);
    const date = parseEventDate(event.timestamp);
    if (!date) {
      console.error(`❌ Invalid timestamp format: ${event.timestamp}, skipping event: ${event.title}`);
      return;
    }
    
    // Create a consistent GUID
    const guid = getEventGuid({
      networkName: event.networkName,
      chainId: event.chainId,
      title: event.title,
      block: event.block,
      link: event.link
    });
    
    // Restore duplicate protection
    if (this.seenGuids.has(guid)) {
      console.log(`⚠️ Skipping duplicate event: ${event.title}`);
      return;
    }
    
    console.log(`✅ Adding new event: ${event.title} with date ${date.toISOString()}`);
    this.seenGuids.add(guid);
    
    this.items.push({
      title: event.title,
      url: event.link,
      description: JSON.stringify({
        eventDetails: {
          network: event.networkName,
          chainId: event.chainId,
          block: event.block,
          timestamp: date.toLocaleString()
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
      date: date,
      guid,
    });
  }

  async generate(): Promise<RSS> {
    // Create new feed
    const sortedFeed = new RSS(CONFIG.feed);
    
    // Get all items and sort by date (newest first)
    const sortedItems = [...this.items]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Add sorted items to feed
    sortedItems.forEach(item => sortedFeed.item(item));
    
    return sortedFeed;
  }

  async upload(feed: RSS): Promise<boolean> {
    try {
      const rssContent = feed.xml();
      
      // Ensure directory exists
      fs.mkdirSync(path.dirname(CONFIG.filePaths.output), { recursive: true });
      
      // Write temporary feed file
      console.log(`📝 Writing temporary feed to ${CONFIG.filePaths.output}`);
      fs.writeFileSync(CONFIG.filePaths.output, rssContent);
      
      // Upload to GCS
      console.log(`📤 Uploading feed to GCS (${GCS_RSS_PATH})`);
      await uploadToGCS(GCS_BUCKET_NAME, CONFIG.filePaths.output, GCS_RSS_PATH, rssContent);
      
      // Clean up temporary file
      console.log(`🧹 Cleaning up temporary feed file`);
      if (fs.existsSync(CONFIG.filePaths.output)) {
        fs.unlinkSync(CONFIG.filePaths.output);
      }
      
      // After successful upload, update the internal items array to match what's in the feed
      const feedItems = (feed as RSSWithItems).items;
      this.items = feedItems;
      console.log(`✅ Feed updated successfully with ${feedItems.length} items`);
      
      return true;
    } catch (error) {
      console.error('Failed to upload RSS feed:', error);
      // Clean up on error too
      if (fs.existsSync(CONFIG.filePaths.output)) {
        fs.unlinkSync(CONFIG.filePaths.output);
      }
      return false;
    }
  }

  // Add a method to update internal items
  updateItems(newItems: ItemOptions[]) {
    this.items = [...newItems];
    // Update seenGuids to match the new items
    this.seenGuids.clear();
    this.items.forEach(item => {
      if (item.guid) this.seenGuids.add(item.guid);
    });
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
  timestamp: string | number,
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
  
  console.log(`📊 Current feed status:
  - Total items: ${items.length}
  - Newest item: ${items[0]?.title || 'none'}
  - Oldest item: ${items[items.length - 1]?.title || 'none'}
  `);
  
  if (items.length > ARCHIVE_ITEM_THRESHOLD) {
    console.log(`📦 Archiving items: keeping ${ARCHIVE_ITEM_THRESHOLD} of ${items.length} items in main feed`);
    
    // Keep newest items in main feed
    const itemsToKeep = items.slice(0, ARCHIVE_ITEM_THRESHOLD);
    // Archive older items
    const itemsToArchive = items.slice(ARCHIVE_ITEM_THRESHOLD);
    
    // Create archive feed with older items
    const archiveFeed = new RSS(CONFIG.feed);
    itemsToArchive.forEach(item => archiveFeed.item(item));
    
    // Generate a unique archive name based on content
    const archiveContent = archiveFeed.xml();
    const archiveHash = ethers.keccak256(ethers.toUtf8Bytes(archiveContent)).slice(2, 10);
    const archivePath = `${GCS_ARCHIVE_PATH}/archive-${archiveHash}-${Date.now()}.xml`;
    
    // Check if an archive with this hash already exists
    const storage = new Storage();
    const bucket = storage.bucket(GCS_BUCKET_NAME);
    const [files] = await bucket.getFiles({ prefix: GCS_ARCHIVE_PATH });
    const existingArchive = files.find(file => file.name.includes(archiveHash));
    
    if (!existingArchive) {
      // Only create new archive if content is unique
      console.log(`📦 Creating new archive with ${itemsToArchive.length} items
      - First archived item: ${itemsToArchive[0]?.title}
      - Last archived item: ${itemsToArchive[itemsToArchive.length - 1]?.title}
      `);
      await uploadToGCS(
        GCS_BUCKET_NAME,
        CONFIG.filePaths.output,
        archivePath,
        archiveContent
      );
    } else {
      console.log(`📦 Archive with this content already exists (${existingArchive.name}), skipping archive creation`);
    }
    
    // Update main feed with newest items
    const newFeed = new RSS(CONFIG.feed);
    itemsToKeep.forEach(item => newFeed.item(item));
    
    console.log(`📤 Preparing main feed update:
    - Items to keep: ${itemsToKeep.length}
    - Newest item: ${itemsToKeep[0]?.title}
    - Oldest item: ${itemsToKeep[itemsToKeep.length - 1]?.title}
    `);
    
    // Update the manager's internal state to only keep the non-archived items
    manager.updateItems(itemsToKeep);
    
    return await manager.upload(newFeed);
  }
  
  console.log(`📤 Uploading full feed with ${items.length} items`);
  return await manager.upload(feed);
};
