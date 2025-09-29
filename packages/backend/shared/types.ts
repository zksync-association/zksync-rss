import { ethers } from "ethers";

export interface NetworkConfig {
  provider: ethers.Provider;
  eventsMapping: {[contractAddress: string]: string[]};
  networkName: string;
  chainId: number;
  blockExplorerUrl: string;
  governanceName: string;
  pollInterval: number;
}

export interface ParsedEvent {
  title: string;
  eventName: string;
  txhash: string;
  blocknumber: number;
  address: string;
  topics: string[];
  timestamp: string;
  interface: ethers.EventFragment;
  args: Record<string, unknown>;
  rawData: string;
  decodedData: Record<string, unknown>;
  link: string;
  proposalLink: string;
  networkName: string;
  chainId: string;
}

export interface ProcessingError {
  block: number;
  timestamp: string;
  error: string;
}

export interface ProcessingRecord {
  network: string;
  startBlock: number;
  endBlock: number;
  timestamp: string;
  errors: ProcessingError[];
  eventsFound: number;
}

export interface ProcessingHistory {
  records: ProcessingRecord[];
  lastArchiveTimestamp?: string | null;
  archivedRecords?: {
    path: string;
    count: number;
    timestamp: string;
  }[];
}
