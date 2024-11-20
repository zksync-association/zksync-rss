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

async function getFeed(): Promise<{ metadata: FeedMetadata; items: FeedItem[] }> {
  const response = await fetch('http://localhost:3001/rss', {
    next: { revalidate: 60 }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch RSS feed');
  }

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
      link: channel.link || '',
      lastBuildDate: channel.lastBuildDate || '',
      language: channel.language || 'en'
    },
    items: (Array.isArray(items) ? items : [items]).map(item => ({
      title: item.title || '',
      description: item.description || '',
      url: item.link || '',
      guid: item.guid || '',
      categories: Array.isArray(item.category) ? item.category : item.category ? [item.category] : [],
      author: item.author || '',
      date: item.pubDate || new Date().toISOString()
    }))
  };
}

export default async function Home() {
  const { metadata, items } = await getFeed();
  
  return (
    <div className="min-h-screen bg-slate-900">
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
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                View Source
              </a>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {items.map((item, index) => (
            <div key={`${item.guid}-${index}`}>
              <Card className="overflow-hidden border border-slate-800 bg-slate-950 shadow-lg">
                <CardHeader className="border-b border-slate-800">
                  <CardTitle className="text-xl">
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 transition-colors"
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
                  <div 
                    className="prose prose-sm prose-invert max-w-none prose-p:text-slate-300 prose-a:text-blue-400"
                    dangerouslySetInnerHTML={{ __html: item.description }}
                  />
                  {item.categories && item.categories.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2" >
                      {item.categories.map((category, i) => (
                        <span 
                          key={`item-${i}`}
                          className="px-3 py-1 rounded-full text-xs bg-slate-800 text-slate-200"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              {index < items.length - 1 && (
                <Separator className="my-6 bg-slate-800" />
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}