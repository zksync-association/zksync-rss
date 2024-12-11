
## ZKSync RSS Backend
Backend service for monitoring blockchain events and generating RSS feeds.
Features
- Event monitoring for ZKSync and Ethereum networks
- RSS feed generation and management
- Google Cloud Storage integration for state persistence
- Historical block processing
- Automatic RSS feed updates


Configuration

```
ETHEREUM_RPC_URL=your_ethereum_rpc_url
ZKSYNC_RPC_URL=your_zksync_rpc_url
GOOGLE_KEY=path/to/your/gcp/key.json
```

├── entry/                  # Entry point scripts
│   ├── generateRss.ts     # RSS generation
│   ├── processBlockRange.ts    # Block range processing
│   ├── processHistoricBlocks.ts # Historical block processing
│   └── startConstantMonitoring.ts # Real-time monitoring
├── monitor/               # Event monitoring logic
├── rss/                  # RSS feed generation
├── shared/               # Shared utilities
│   ├── gcp.ts           # Google Cloud Storage utilities
│   └── rssUtils.ts      # RSS feed utilities
└── data/                # Local data storage