export const revalidate = 60;

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { XMLParser } from 'fast-xml-parser';
import { getGovBodyFromAddress } from "./constants";

// ======= Utilities =======

function truncateAddress(address: string): string {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

type EventDataType = Record<string, unknown>;

function truncateEventData(eventData: EventDataType): EventDataType {
  if (!eventData) return eventData;

  const result = JSON.parse(JSON.stringify(eventData));

  function processValue(obj: unknown): unknown {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(item => processValue(item));

    const objRecord = obj as Record<string, unknown>;
    for (const key in objRecord) {
      if (typeof objRecord[key] === 'string' && objRecord[key].toString().startsWith('0x') && objRecord[key].toString().length > 100) {
        objRecord[key] = `${objRecord[key].toString().substring(0, 10)}...${objRecord[key].toString().substring(objRecord[key].toString().length - 8)}`;
      } else if (typeof objRecord[key] === 'object' && objRecord[key] !== null) {
        objRecord[key] = processValue(objRecord[key]);
      }
    }

    return objRecord;
  }

  return processValue(result) as EventDataType;
}

function formatTitle(title: string, contractAddress: string, network: string): string {
  if (!title) return '';

  if (title.toLowerCase().includes("unknown governance body")) {
    const parts = title.split('-');
    if (parts.length > 1) {
      const eventType = parts[0].trim();
      const govBody = getGovBodyFromAddress(contractAddress);
      const displayName = (!govBody || govBody.toLowerCase().includes("unknown"))
        ? network : govBody;
      return `${eventType} - ${displayName}`;
    }
  }

  return title;
}

// ======= Types =======

interface EventDetails {
  network: string;
  chainId: string;
  block: string;
  timestamp: string;
}

interface GovernanceInfo {
  governanceBody: string;
  eventType: string;
  contractAddress: string;
  proposalLink?: string;
}

interface EventData {
  [key: string]: unknown;
}

interface EventDescription {
  eventDetails: EventDetails;
  governanceInfo: GovernanceInfo;
  eventData: EventData;
}

interface FeedItem {
  title: string;
  description: string;
  url: string;
  guid: string;
  categories?: string[];
  author?: string;
  date: string;
}

interface FeedMetadata {
  title: string;
  description: string;
  link: string;
  lastBuildDate?: string;
  language?: string;
}

interface Feed {
  metadata: FeedMetadata;
  items: FeedItem[];
}

// ======= Components =======

function EventDetailsSection({ details }: { details: EventDetails }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Event Details</h3>
      <ul className="space-y-1">
        <li>Network: {details.network}</li>
        <li>Chain ID: {details.chainId}</li>
        <li>Block: {details.block}</li>
        <li>Timestamp: {details.timestamp}</li>
      </ul>
    </div>
  );
}

function GovernanceInfoSection({ info, network }: { info: GovernanceInfo; network: string }) {
  const governanceBody = (() => {
    // Try governanceBody first
    if (info.governanceBody && !info.governanceBody.toLowerCase().includes("unknown"))
      return info.governanceBody;

    // Then check contract address
    const govBody = getGovBodyFromAddress(info.contractAddress);
    if (govBody && !govBody.toLowerCase().includes("unknown"))
      return govBody;

    // Fall back to network
    return network;
  })();

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Governance Info</h3>
      <ul className="space-y-1">
        <li>Governance Body: {governanceBody}</li>
        <li>Event Type: {info.eventType}</li>
        <li className="break-words">
          Contract Address:
          <span className="md:hidden">{truncateAddress(info.contractAddress)}</span>
          <span className="hidden md:inline">{info.contractAddress}</span>
        </li>
        {info.proposalLink && (
          <li>
            Proposal Link:{' '}
            <a
              href={info.proposalLink}
              className="text-white hover:text-white underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Proposal
            </a>
          </li>
        )}
      </ul>
    </div>
  );
}

function EventDataSection({ data }: { data: EventData }) {
  const processedData = truncateEventData(data);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Event Data</h3>
      <pre className="bg-neutral-950 p-4 rounded-lg overflow-x-auto max-w-full text-sm whitespace-pre-wrap break-all">
        {JSON.stringify(processedData, null, 2)}
      </pre>
    </div>
  );
}

function EventCard({ item }: { item: FeedItem }) {
  try {
    // Parse description to get event data
    const parsedData: EventDescription = JSON.parse(item.description);
    const network = parsedData.eventDetails.network;
    const contractAddress = parsedData.governanceInfo.contractAddress;

    return (
      <Card className="overflow-hidden border border-neutral-800 bg-black shadow-lg">
        <CardHeader className="border-b border-neutral-800">
          <CardTitle className="text-xl">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-300 hover:text-white underline transition-colors inline-flex items-center gap-1"
            >
              {formatTitle(item.title, contractAddress, network)}
            </a>
          </CardTitle>
          <CardDescription className="text-slate-400">
            {item.author && <span>By {item.author} • </span>}
            <span>{new Date(item.date).toLocaleDateString()}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="prose prose-sm prose-invert max-w-none prose-p:text-slate-300 prose-a:text-neutral-300 prose-a:hover:text-white space-y-6">
            <EventDetailsSection details={parsedData.eventDetails} />
            <GovernanceInfoSection info={parsedData.governanceInfo} network={network} />
            <EventDataSection data={parsedData.eventData} />
          </div>
        </CardContent>
      </Card>
    );
  } catch {
    // Handle parsing errors or missing properties
    return (
      <Card className="overflow-hidden border border-neutral-800 bg-black shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl text-red-400">Invalid Event Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-400">This event contains invalid data format</div>
        </CardContent>
      </Card>
    );
  }
}

// ======= Data Fetching =======

async function getFeed(): Promise<Feed> {
  const apiUrl = process.env.NEXT_PUBLIC_RSS_FILE;

  if (!apiUrl) {
    return {
      metadata: {
        title: 'Configuration Error',
        description: 'The API URL has not been configured. Please set NEXT_PUBLIC_API_URL environment variable.',
        link: '',
      },
      items: []
    };
  }

  try {
    const response = await fetch(apiUrl, { next: { revalidate: 10 } });

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status}`);
    }

    const data = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      parseAttributeValue: true
    });

    const result = parser.parse(data);
    const channel = result.rss.channel;
    const items = channel.item || [];

    return {
      metadata: {
        title: channel.title || '',
        description: channel.description || '',
        link: apiUrl,
        lastBuildDate: channel.lastBuildDate || '',
        language: channel.language || 'en'
      },
      items: (Array.isArray(items) ? items : [items])
        .map(item => ({
          title: item.title || '',
          description: item.description || '',
          url: item.link || '',
          guid: item.guid || item.link || `${Date.now()}-${Math.random()}`,
          categories: Array.isArray(item.category) ? item.category : item.category ? [item.category] : [],
          author: item['dc:creator'],
          date: item.pubDate || new Date().toISOString()
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };
  } catch (error) {
    console.error('Error fetching RSS feed:', error);
    return {
      metadata: {
        title: 'Feed Not Found',
        description: 'The RSS feed could not be loaded at this time.',
        link: '',
      },
      items: []
    };
  }
}

// ======= Main Page Component =======

export default async function Home() {
  const { metadata, items } = await getFeed();

  if (metadata.title === 'Feed Not Found' || metadata.title === 'Configuration Error') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Card className="w-96 border border-slate-800 bg-slate-950">
          <CardHeader>
            <CardTitle className="text-red-400">{metadata.title}</CardTitle>
            <CardDescription className="text-slate-400">
              {metadata.description}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Format page title to remove "Unknown" references
  const pageTitle = metadata.title && metadata.title.toLowerCase().includes("unknown")
    ? "ZKSync Governance Events"
    : metadata.title;

  return (
    <div className="min-h-screen bg-black">
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4 text-white">{pageTitle}</h1>

          {metadata.description && (
            <p className="text-slate-300 text-lg mb-4">{metadata.description}</p>
          )}

          <div className="text-sm text-slate-400 space-y-1">
            {metadata.lastBuildDate && (
              <p>Last updated: {new Date(metadata.lastBuildDate).toLocaleString()}</p>
            )}
            {metadata.link && (
              <a
                href={metadata.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-300 hover:text-white underline"
              >
                View Source
              </a>
            )}
          </div>
        </header>

        <div className="space-y-6">
          {items.map((item, index) => (
            <div key={`item-${index}-${item.title.substring(0, 20).replace(/\s/g, '-')}`}>
              <EventCard item={item} />
              {index < items.length - 1 && (
                <Separator className="my-6 bg-neutral-800" />
              )}
            </div>
          ))}

          {items.length === 0 && (
            <Card className="overflow-hidden border border-neutral-800 bg-black shadow-lg p-8 text-center">
              <p className="text-neutral-400">No events found in the feed.</p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
