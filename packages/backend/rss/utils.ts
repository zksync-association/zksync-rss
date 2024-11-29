import RSS, { ItemOptions } from "rss";
import { ethers } from "ethers";
import { uploadToGCS, GCS_BUCKET_NAME, GCS_RSS_PATH, GCS_ARCHIVE_PATH } from "~/shared";
import fs from 'fs';
import path from 'path';
// Simplified configuration
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

// Simplified feed management
class RSSFeedManager {
  private feed: RSS;

  constructor() {
    this.feed = new RSS(CONFIG.feed);
    this.loadSavedItems();
  }

  private loadSavedItems() {
    if (!fs.existsSync(CONFIG.filePaths.data)) return;
    
    try {
      const items = JSON.parse(fs.readFileSync(CONFIG.filePaths.data, 'utf-8'))
        .sort((a: RSS.ItemOptions, b: RSS.ItemOptions) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA; // Sort in descending order (newest first)
        });
      items.forEach((item: RSS.ItemOptions) => this.feed.item(item));
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
    const items = (this.feed as any).items.map((item: any) => ({
      title: item.title,
      description: item.description,
      url: item.url,
      guid: item.guid,
      categories: item.categories,
      author: item.author,
      date: item.date
    }));
    
    fs.mkdirSync(path.dirname(CONFIG.filePaths.data), { recursive: true });
    fs.writeFileSync(CONFIG.filePaths.data, JSON.stringify(items, null, 2));
  }

  async generate(): Promise<RSS> {
    const sortedFeed = new RSS(CONFIG.feed);
    const items = (this.feed as any).items
        .sort((a: any, b: any) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA;
        });
    
    items.forEach((item: ItemOptions) => sortedFeed.item(item));
    return sortedFeed;
}

async upload(feed: RSS): Promise<boolean> {
    try {
        const rssContent = feed.xml({ indent: true });
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

// Create single instance
const feedManager = new RSSFeedManager();

// Simplified exports
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

function deduplicateItems(items: ItemOptions[]) {
  const seen = new Set();
  return items.filter(item => {
    const uniqueId = item.guid || item.title + item.date;
    if (seen.has(uniqueId)) {
      return false;
    }
    seen.add(uniqueId);
    return true;
  });
}


export const updateRSSFeed = async () => {
  const archiveThreshold = 100;
  const feed = await feedManager.generate();
  const items = (feed as any).items;

  if (items.length > archiveThreshold) {
    // Deduplicate items
    const deduplicateItems = (items: ItemOptions[]) => {
      const seen = new Set();
      return items.filter(item => {
        const uniqueId = item.guid || item.title + item.date;
        if (seen.has(uniqueId)) return false;
        seen.add(uniqueId);
        return true;
      });
    };

    // Create archive with older items
    const itemsToArchive = deduplicateItems(items.slice(archiveThreshold));
    const archiveFeed = new RSS(CONFIG.feed);
    itemsToArchive.forEach((item: ItemOptions) => archiveFeed.item(item));

    // Create archive filename using first and last archived items
    const oldestDate = new Date(itemsToArchive[itemsToArchive.length - 1]?.date || new Date());
    const newestDate = new Date(itemsToArchive[0]?.date || new Date());
    const archiveFileName = `${oldestDate.toISOString().split('T')[0]}-${newestDate.toISOString().split('T')[0]}-rss.xml`;

    // Upload archive
    const archiveContent = archiveFeed.xml();
    const localArchivePath = path.join(__dirname, '../data/archives', archiveFileName);
    await uploadToGCS(
      GCS_BUCKET_NAME,
      localArchivePath,
      `${GCS_ARCHIVE_PATH}${archiveFileName}`,
      archiveContent
    );

    if (fs.existsSync(localArchivePath)) {
      fs.unlinkSync(localArchivePath);
    }

    // Create new feed with only recent items
    const recentItems = deduplicateItems(items.slice(0, archiveThreshold));
    const newFeed = new RSS(CONFIG.feed);
    recentItems.forEach((item: ItemOptions) => newFeed.item(item));

    // Upload the new feed
    await feedManager.upload(newFeed);
    return true;
  }

  // Upload the original feed if no archiving needed
  const deduplicatedItems = deduplicateItems(items);
  const deduplicatedFeed = new RSS(CONFIG.feed);
  deduplicatedItems.forEach(item => deduplicatedFeed.item(item));

  await feedManager.upload(deduplicatedFeed);
  return true;
};