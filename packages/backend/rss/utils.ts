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

  constructor() {
    this.feed = new RSS(CONFIG.feed);
    this.loadSavedItems();
  }

  private loadSavedItems() {
    if (!fs.existsSync(CONFIG.filePaths.data)) {
      console.log("No saved items file exists");
      return;
    }
    
    try {
      const items = JSON.parse(fs.readFileSync(CONFIG.filePaths.data, 'utf-8'))
        .sort((a: RSS.ItemOptions, b: RSS.ItemOptions) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
        });
      console.log(`Loaded ${items.length} saved items`);
      items.forEach((item: RSS.ItemOptions) => this.feed.item(item));
      fs.unlinkSync(CONFIG.filePaths.data);
    } catch (error) {
      console.error('Error loading RSS feed:', error);
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
    console.log(`Adding event: ${event.title}`);
    const guid = ethers.keccak256(ethers.toUtf8Bytes(event.title + event.block + event.link));
    
    const description = JSON.stringify({
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
    });
    
    this.feed.item({
      title: event.title,
      url: event.link,
      description,
      author: event.govBody,
      categories: event.topics,
      date: new Date(event.timestamp),
      guid,
    });

    this.save();
  }

  private save() {
    const items = (this.feed as any).items.map((item: ItemOptions) => ({
      title: item.title,
      description: item.description,
      url: item.url,
      guid: item.guid,
      categories: item.categories,
      author: item.author,
      date: item.date
    }));
    
    console.log(`Saving ${items.length} items to file`);
    fs.mkdirSync(path.dirname(CONFIG.filePaths.data), { recursive: true });
    fs.writeFileSync(CONFIG.filePaths.data, JSON.stringify(items, null, 2));
  }

  async generate(): Promise<RSS> {
    const sortedFeed = new RSS(CONFIG.feed);
    const items = (this.feed as RSSWithItems).items
        .sort((a: ItemOptions, b: ItemOptions) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA;
        });
    
    items.forEach((item: ItemOptions) => sortedFeed.item(item));
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


const feedManager = new RSSFeedManager();

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
) => feedManager.addEvent({
  address, eventName, topics, title, link, networkName,
  chainId, block, govBody, proposalLink, timestamp, eventArgs
});


export const updateRSSFeed = async () => {
  // Add logging to track items
  console.log("Starting updateRSSFeed");
  
  // Create archives directory first
  const archivesDir = path.join(__dirname, '../data/archives');
  fs.mkdirSync(archivesDir, { recursive: true });

  // Download and process archived items before generating new feed
  const archivedItems = await downloadArchives(archivesDir);
  console.log(`Downloaded ${archivedItems.length} archived items`);

  // Generate new feed after we have archived items
  const feed = await feedManager.generate();
  const items = (feed as RSSWithItems).items;
  console.log(`Generated feed with ${items.length} items`);
  
  if (items.length > ARCHIVE_ITEM_THRESHOLD) {
    // Archive older items (items beyond the threshold)
    const itemsToArchive = items.slice(0, items.length - ARCHIVE_ITEM_THRESHOLD);
    console.log(`Archiving ${itemsToArchive.length} items`);
    
    // Merge and sort all archived items
    const allArchivedItems = [...archivedItems, ...itemsToArchive].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    console.log(`Total archived items after merge: ${allArchivedItems.length}`);
    
    // Keep the most recent ARCHIVE_ITEM_THRESHOLD items in the main feed
    const recentItems = items.slice(-ARCHIVE_ITEM_THRESHOLD);
    console.log(`Keeping ${recentItems.length} recent items in main feed`);
    const newFeed = new RSS(CONFIG.feed);
    recentItems.forEach((item: ItemOptions) => newFeed.item(item));
    
    await feedManager.upload(newFeed);
  } else {
    console.log(`Uploading all ${items.length} items to main feed`);
    await feedManager.upload(feed);
  }
  
  // Clean up the data directory
  const dataDir = path.join(__dirname, '../data');
  if (fs.existsSync(dataDir)) {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
  
  return true;
};


async function downloadArchives(archivesDir: string): Promise<ItemOptions[]> {
  try {
    const storage = new Storage(); 
    const bucket = storage.bucket(GCS_BUCKET_NAME); 
    const [files] = await bucket.getFiles({ prefix: GCS_ARCHIVE_PATH });
    
    // Sort files by their timestamp in filename (newest first)
    const sortedFiles = files.sort((a, b) => {
      const timestampA = parseInt(a.name.split('-').pop()?.replace('.xml', '') || '0');
      const timestampB = parseInt(b.name.split('-').pop()?.replace('.xml', '') || '0');
      return timestampB - timestampA;
    });
    
    let archivedItems: ItemOptions[] = [];
    
    for (const file of sortedFiles) {
      const localPath = path.join(archivesDir, path.basename(file.name));
      await file.download({ destination: localPath });
      
      const content = fs.readFileSync(localPath, 'utf-8');
      const parser = new Parser();
      const result = await parser.parseString(content);
      
      const parsedItems = result.items.map((item: ParsedItem): ItemOptions => ({
        title: item.title || 'Untitled',
        description: item.contentSnippet || item.description || '',
        url: item.link || '',
        date: item.isoDate || item.pubDate || new Date().toISOString(),
        categories: item.categories || [],
        author: item.creator || item.author || 'Unknown',
        guid: item.guid || item.id || ethers.randomBytes(32).toString()
      }));
      
      archivedItems = [...archivedItems, ...parsedItems];
      
      // Clean up downloaded file
      fs.unlinkSync(localPath);
    }
    
    return archivedItems;
  } catch (error) {
    console.error('Error downloading archives:', error);
    return [];
  }
}