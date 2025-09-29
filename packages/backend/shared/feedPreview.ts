import fs from "fs";
import path from "path";
import Parser from "rss-parser";
import RSS from "rss";
import { ethers } from "ethers";
import { downloadFromGCS } from "./gcp";
import { GCS_BUCKET_NAME, GCS_RSS_PATH } from "./constants";
import { ParsedEvent } from "./types";
import { getGovBodyFromAddress } from "./utils";

export interface FeedSummary {
  guid: string;
  title: string;
  link: string;
  network: string;
  block?: number;
  txhash?: string;
  timestamp: string;
  description: string;
  categories: string[];
  author: string;
  source: "gcs" | "range" | "both";
}

const DEFAULT_PREVIEW_PATH = path.join(__dirname, "../data/merged-feed-preview.xml");

type FeedDescription = {
  eventDetails?: {
    network?: string;
    block?: number;
    timestamp?: string | number;
  };
  eventData?: {
    txhash?: string;
    transactionHash?: string;
  };
};

type ExtendedParserItem = Parser.Item & {
  [key: string]: unknown;
  "content:encoded"?: string;
};

export const ensureIsoString = (value: string | number | undefined): string => {
  if (value === undefined || value === null) {
    return new Date(0).toISOString();
  }
  if (typeof value === "number") {
    return new Date(value).toISOString();
  }
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    if (value.length <= 11) {
      return new Date(numeric * 1000).toISOString();
    }
    return new Date(numeric).toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString();
};

const normalizeValue = (value: unknown): unknown => {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, val]) => [key, normalizeValue(val)]);
    return Object.fromEntries(entries);
  }
  return value;
};

export const normalizeArgs = (args: Record<string, unknown>): Record<string, unknown> => {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    normalized[key] = normalizeValue(value);
  }
  return normalized;
};

export const getEventGuid = (event: {
  networkName: string;
  chainId: number;
  title: string;
  block: number;
  link: string;
}): string => {
  const normalized = [
    event.networkName.toLowerCase().replace(/\s+/g, ""),
    event.chainId,
    event.title.toLowerCase().replace(/\s+/g, ""),
    event.block,
    event.link.toLowerCase()
  ].join("-");
  return ethers.keccak256(ethers.toUtf8Bytes(normalized));
};

export const loadExistingFeedSummaries = async (): Promise<FeedSummary[]> => {
  if (!GCS_BUCKET_NAME || !GCS_RSS_PATH) {
    console.warn("⚠️ Missing GCS configuration, skipping feed download");
    return [];
  }

  const tempDir = path.join(__dirname, "../data");
  const tempPath = path.join(tempDir, "gcs-feed.xml");

  try {
    await downloadFromGCS(GCS_BUCKET_NAME, GCS_RSS_PATH, tempPath);
  } catch (error) {
    console.warn("⚠️ Unable to download existing feed from GCS", error);
    return [];
  }

  try {
    const parser = new Parser();
    const xml = fs.readFileSync(tempPath, "utf8");
    const feed = await parser.parseString(xml);
    const summaries: FeedSummary[] = [];

    for (const item of (feed.items as ExtendedParserItem[] | undefined) ?? []) {
      const guidCandidate = [item.guid, (item as Record<string, unknown>).id, item.link, item.title].find(
        (value): value is string => typeof value === "string"
      );
      if (!guidCandidate) {
        continue;
      }
      const guid = guidCandidate;

      let parsedDescription: FeedDescription | null = null;
      const rawDescription =
        (typeof item.content === "string" ? item.content : undefined) ??
        (typeof item["content:encoded"] === "string" ? item["content:encoded"] : undefined) ??
        (typeof item.description === "string" ? item.description : "");
      try {
        if (typeof rawDescription === "string" && rawDescription.trim().length > 0) {
          parsedDescription = JSON.parse(rawDescription) as FeedDescription;
        }
      } catch (err) {
        console.warn(`⚠️ Failed to parse feed item description for guid ${guid}:`, err);
      }

      const network = parsedDescription?.eventDetails?.network ?? "unknown";
      const block = parsedDescription?.eventDetails?.block;
      const timestampSource = parsedDescription?.eventDetails?.timestamp ?? item.isoDate ?? item.pubDate;
      const txhash = parsedDescription?.eventData?.txhash ?? parsedDescription?.eventData?.transactionHash;
      const categories = Array.isArray(item.categories) ? item.categories : [];
      const author = typeof item.creator === "string"
        ? item.creator
        : typeof (item as Record<string, unknown>).author === "string"
          ? ((item as Record<string, unknown>).author as string)
          : "";

      summaries.push({
        guid,
        title: item.title || "",
        link: item.link || "",
        network,
        block,
        txhash,
        timestamp: ensureIsoString(timestampSource),
        description: typeof rawDescription === "string" ? rawDescription : JSON.stringify(parsedDescription ?? {}),
        categories,
        author,
        source: "gcs"
      });
    }

    return summaries;
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
};

export const summarizeRangeEvents = (events: ParsedEvent[]): FeedSummary[] => {
  return events.map(event => {
    const guid = getEventGuid({
      networkName: event.networkName,
      chainId: Number(event.chainId),
      title: event.title,
      block: event.blocknumber,
      link: event.link
    });

    const timestampIso = ensureIsoString(event.timestamp);
    const timestampDate = new Date(timestampIso);
    const governanceBody = getGovBodyFromAddress(event.address);
    const normalizedArgs = normalizeArgs(event.args);

    const description = JSON.stringify({
      eventDetails: {
        network: event.networkName,
        chainId: Number(event.chainId),
        block: event.blocknumber,
        timestamp: timestampDate.toLocaleString()
      },
      governanceInfo: {
        governanceBody,
        eventType: event.eventName,
        contractAddress: event.address,
        proposalLink: event.proposalLink
      },
      eventData: normalizedArgs
    });

    return {
      guid,
      title: event.title,
      link: event.link,
      network: event.networkName,
      block: event.blocknumber,
      txhash: event.txhash,
      timestamp: timestampIso,
      description,
      categories: event.topics,
      author: governanceBody,
      source: "range"
    } satisfies FeedSummary;
  });
};

export const mergeSummaries = (existing: FeedSummary[], fresh: FeedSummary[]): FeedSummary[] => {
  const combined = new Map<string, FeedSummary>();

  for (const item of existing) {
    combined.set(item.guid, item);
  }

  for (const item of fresh) {
    const existingItem = combined.get(item.guid);
    if (existingItem) {
      const newerTimestamp = new Date(item.timestamp).getTime() > new Date(existingItem.timestamp).getTime()
        ? item.timestamp
        : existingItem.timestamp;

      combined.set(item.guid, {
        ...existingItem,
        block: existingItem.block ?? item.block,
        txhash: existingItem.txhash ?? item.txhash,
        timestamp: newerTimestamp,
        description: existingItem.description || item.description,
        categories: existingItem.categories.length ? existingItem.categories : item.categories,
        author: existingItem.author || item.author,
        source: existingItem.source === item.source ? existingItem.source : "both"
      });
    } else {
      combined.set(item.guid, item);
    }
  }

  return Array.from(combined.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const writeMergedFeedPreview = (entries: FeedSummary[], outputPath: string = DEFAULT_PREVIEW_PATH): string => {
  const feed = new RSS({
    title: "ZKsync Governance Feed (local preview)",
    description: "Merged snapshot of on-chain governance events",
    feed_url: "https://feed.zkNation.io/rss.xml",
    site_url: "https://feed.zkNation.io",
    language: "en",
    managingEditor: "admin@serotonindesigns.com",
    webMaster: "admin@serotonindesigns.com",
    pubDate: new Date()
  });

  for (const entry of entries) {
    feed.item({
      title: entry.title,
      description: entry.description,
      url: entry.link,
      guid: entry.guid,
      categories: entry.categories,
      author: entry.author,
      date: new Date(entry.timestamp)
    });
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, feed.xml());
  return outputPath;
};
