export const revalidate = 60;

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { XMLParser } from 'fast-xml-parser';

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

async function getFeed(): Promise<Feed> {
  // Public link to rss file in gcp
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
    const response = await fetch(`${apiUrl}`, {
      next: {
        revalidate: 10
      }
    });
    const data = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      parseAttributeValue: true
    });
    
    const result = parser.parse(data);
    const channel = result.rss.channel;
    const items = channel.item;
    return {
      metadata: {
        title: channel.title || '',
        description: channel.description || '',
        link: process.env.NEXT_PUBLIC_RSS_FILE || '',
        lastBuildDate: channel.lastBuildDate || '',
        language: channel.language || 'en'
      },
      items: (Array.isArray(items) ? items : [items])
      .map(item => ({
        title: item.title || '',
        description: item.description || '',
        url: item.link || '',
        guid: item.guid || '',
        categories: Array.isArray(item.category) ? item.category : item.category ? [item.category] : [],
        author: item['dc:creator'],
        date: item.pubDate || new Date().toISOString()
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Sort by date, newest first
    };

  } catch {
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

const RenderDescription = ({ description }: { description: string }) => {
  try {
    const data = JSON.parse(description);
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Event Details</h3>
          <ul className="space-y-1">
            <li>Network: {data.eventDetails.network}</li>
            <li>Chain ID: {data.eventDetails.chainId}</li>
            <li>Block: {data.eventDetails.block}</li>
            <li>Timestamp: {data.eventDetails.timestamp}</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Governance Info</h3>
          <ul className="space-y-1">
            <li>Governance Body: {data.governanceInfo.governanceBody}</li>
            <li>Event Type: {data.governanceInfo.eventType}</li>
            <li>Contract Address: {data.governanceInfo.contractAddress}</li>
            {data.governanceInfo.proposalLink && (
              <li>
                Proposal Link:{' '}
                <a 
                  href={data.governanceInfo.proposalLink}
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

        <div>
          <h3 className="text-lg font-semibold mb-2">Event Data</h3>
          <pre className="bg-neutral-950 p-4 rounded-lg overflow-x-auto">
            {JSON.stringify(data.eventData, null, 2)}
          </pre>
        </div>
      </div>
    );
  } catch {
    return <div className="text-red-400">Invalid description format</div>;
  }
};

export default async function Home() {
  const { metadata, items } = await getFeed();
  if (metadata.title === 'Feed Not Found') {
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

  return (
    <div className="min-h-screen bg-black">
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4 text-white">{metadata.title}</h1>
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
        </div>

        <div className="space-y-6">
          {items.map((item, index) => (
            <div key={`${item.guid}-${index}`}>
              <Card className="overflow-hidden border border-neutral-800 bg-black shadow-lg">
                <CardHeader className="border-b border-neutral-800">
                  <CardTitle className="text-xl">
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-neutral-300 hover:text-white underline transition-colors inline-flex items-center gap-1"
                    >
                      {item.title}
                    </a>
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    {item.author && <span>By {item.author} • </span>}
                    <span>{new Date(item.date).toLocaleDateString()}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="prose prose-sm prose-invert max-w-none prose-p:text-slate-300 prose-a:text-neutral-300 prose-a:hover:text-white">
                    <RenderDescription description={item.description} />
                  </div>
                </CardContent>
              </Card>
              {index < items.length - 1 && (
                <Separator className="my-6 bg-neutral-800" />
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}