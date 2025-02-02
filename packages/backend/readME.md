## ZKSync RSS Backend
Backend service for monitoring blockchain events and generating RSS feeds.

Features
- Event monitoring for ZKSync and Ethereum networks
- RSS feed generation and management
- Google Cloud Storage integration for state persistence
- Historical block processing
- Automatic RSS feed updates
- Specific block processing for error recovery

Configuration

```
ETHEREUM_RPC_URL=your_ethereum_rpc_url
ZKSYNC_RPC_URL=your_zksync_rpc_url
GCS_RSS_PATH=rss/feed.xml
GCS_ARCHIVE_PATH=rss/archive
GCS_BUCKET_NAME=your_bucket_name
GCS_STATE_FILE_PATH=state/processing-state.json
GCS_PROCESSING_HISTORY_PATH=state/processing-history.json
// GKE workloads compatible, configure in GKE workloads
```

├── entry/                  # Entry point scripts
│   ├── processBlockRange.ts    # Regular block processing
│   ├── processHistoricBlocks.ts # Historical block processing
│   ├── processSpecificBlocks.ts # Recovery and specific block processing
├── rss/                  # RSS feed generation
├── shared/               # Shared utilities
│   ├── gcp.ts           # Google Cloud Storage utilities
│   └── types, constants, utils 
└── data/                # Local data storage

## Available Scripts
- `npm run process-blocks` - Regular block monitoring
- `npm run process-historic-blocks` - Process historical blocks
- `npm run process-specific-blocks <network> <block1> <block2> ...` - Process specific blocks

```
ETHEREUM_RPC_URL=your_ethereum_rpc_url
ZKSYNC_RPC_URL=your_zksync_rpc_url
// GKE workloads compatible, configure in GKE workloads
```

├── entry/                  # Entry point scripts
│   ├── processBlockRange.ts    # Block range processing
│   ├── processHistoricBlocks.ts # Historical block processing
├── rss/                  # RSS feed generation
├── shared/               # Shared utilities
│   ├── gcp.ts           # Google Cloud Storage utilities
│   └── types, constants, utils 
└── data/                # Local data storage