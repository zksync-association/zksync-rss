import RSS from "rss";
import { ethers } from "ethers";

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

// Create an instance of the RSS feed
export const feed = new RSS(feedOptions);

// Helper function to create unique ID
const createUniqueID = (description: string) => {
  return ethers.keccak256(ethers.toUtf8Bytes(description));
};

// Function to format and add an event as an RSS item
export const addEventToRSS = (event: any, networkName: string, chainID: number, block: number, govBody: string, proposalLink: string | null) => {
  const title = `${event.eventName} - ${govBody}`;
  const guid = createUniqueID(title + event.description);

  const newItem: RSS.ItemOptions = {
      title,
      url: event.link,
      description: `
          <strong>Network:</strong> ${networkName}<br />
          <strong>Chain ID:</strong> ${chainID}<br />
          <strong>Block:</strong> ${block}<br />
          <strong>Governance Body:</strong> ${govBody}<br />
          <strong>Event Type:</strong> ${event.eventName}<br />
          ${proposalLink ? `<strong>Proposal Link:</strong> <a href="${proposalLink}">${proposalLink}</a><br />` : ""}
      `,
      author: govBody,
      categories: [event.eventName],
      date: new Date(), // Assuming the timestamp is the current time for this example
      guid, // Use the generated unique ID
  };

  feed.item(newItem);
}

// Generate the RSS XML
const rssXML = feed.xml({ indent: true });

// Output the RSS XML (you can save it to a file or send it as a response)
console.log(rssXML);