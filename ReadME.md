# ZKSync RSS Feed Generator

A service that monitors ZKSync and Ethereum networks for governance events and generates RSS feeds.

## Features

- Monitors both ZKSync and Ethereum networks for governance events
- Generates RSS feeds from blockchain events
- Stores state and RSS feeds in Google Cloud Storage
- Supports both real-time monitoring and historical block processing
- Automatic RSS feed updates when new events are found
- Error tracking and recovery through processing history
- Specific block processing for targeted event recovery

## Setup

1. Clone the repository
2. Install dependencies
3. Create `.env` file in `packages/backend` with required environment variables:
```bash
ETHEREUM_RPC_URL=your_ethereum_rpc_url
ZKSYNC_RPC_URL=your_zksync_rpc_url
GCS_RSS_PATH=rss/feed.xml
GCS_ARCHIVE_PATH=rss/archive
GCS_BUCKET_NAME=your_bucket_name
GCS_STATE_FILE_PATH=state/processing-state.json
GCS_PROCESSING_HISTORY_PATH=state/processing-history.json
```
4. Create a GCP storage bucket with the following folder: zksync-rss
5. Configure your GKE workload identity on your cluster

## First Time Setup

1. Clear existing GCP data:
```bash
gsutil -m rm -r gs://your-bucket-name/**
```

2. Initialize with historical data:
```bash
npm run process-historic-blocks
```

3. Set up crontab for regular processing:
```bash
crontab -e
# Add line:
*/10 * * * * cd /path/to/project/packages/backend && npm run process-blocks
```

4. Configure GCS cache settings:
```bash
gsutil setmeta -h "Cache-Control:no-cache,max-age=0" \
  gs://your-bucket-name/rss/feed.xml \
  gs://your-bucket-name/state/processing-state.json \
  gs://your-bucket-name/state/processing-history.json
```

## Error Recovery

The system maintains a processing history in GCS (`processing-history.json`):
```json
{
  "records": [
    {
      "network": "ZKSync",
      "startBlock": 54549000,
      "endBlock": 54549100,
      "timestamp": "2024-03-20T12:00:00Z",
      "errors": [
        {
          "block": 54549081,
          "timestamp": "2024-03-20T12:00:01Z",
          "error": "Failed to decode event..."
        }
      ],
      "eventsFound": 5
    }
  ],
  "archivedRecords": [
    {
      "path": "state/archive/processing-history-1710936000000.json",
      "count": 900
    }
  ]
}
```

To recover from errors:
1. Check processing history:
```bash
gsutil cat gs://your-bucket-name/state/processing-history.json
```

2. Reprocess specific blocks:
```bash
npm run process-specific-blocks <network> <block1> <block2> ...
# Example:
npm run process-specific-blocks zksync 54549081 54549082
```

### Option B: Running With Docker

7. Build and run the initial setup:
```bash
docker build -t zksync-rss-backend-init -f Dockerfile.init .
docker run zksync-rss-backend-init
```

8. Build and run the recurring process:
```bash
docker build -t zksync-rss-backend .
docker run zksync-rss-backend
```

9. Setup a scheduler to run the Docker container every x minutes

## Available Scripts

- `npm run process-blocks` - Process latest blocks
- `npm run process-historic-blocks` - Process predefined historical blocks
- `npm run process-specific-blocks` - Process specific blocks for error recovery
- `npm run catchup-block-range --workspace=@zksync-rss/backend -- <network> <fromBlock> <toBlock>` - Backfill a range while updating processing state and history
- `npm run frontend` - Start frontend development server
- `npm run lint` - Run linter check
- `npm run type-check` - Run TypeScript type checking
- `npm run build` - Build both frontend and backend
- `npm run clean` - Clean all dependencies and build artifacts

## CI Gate (run locally before pushing)

The GitHub workflow runs the following commands and they must pass locally without warnings:

```bash
npm run lint
npm run type-check
npm run build
```

`npm run lint` now enforces zero warnings (non-null assertions, unused parameters, and stray `any`s have all been eliminated), so treat any new warning as a failure to be fixed before opening a PR.

## Docker Commands

- `docker build -t zksync-rss-backend-init -f Dockerfile.init .` - Build initial setup image
- `docker run zksync-rss-backend-init` - Run initial setup
- `docker build -t zksync-rss-backend .` - Build main service image
- `docker run zksync-rss-backend` - Run the block processing service

## Project Structure

```
├── packages/
│   ├── backend/    # Backend service
│   │   ├── entry/
│   │   │   ├── processBlockRange.ts    # Regular processing
│   │   │   ├── processHistoricBlocks.ts # Historical processing
│   │   │   └── processSpecificBlocks.ts # Recovery processing
│   │   ├── rss/    # RSS generation
│   │   └── shared/ # Shared utilities
│   └── frontend/   # Frontend application
├── Dockerfile      # Docker configuration for recurring process
├── Dockerfile.init # Docker configuration for initial setup
├── package.json
└── README.md
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Entry Points   │     │  Core Services  │     │  Storage        │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ processBlocks   │────>│ Event Monitor   │────>│ RSS Feed        │
│ processHistoric │     │ RSS Generator   │     │ State File      │
│ processSpecific │     │ Error Tracker   │     │ Process History │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │                        │
         └──────────────────────┴────────────────────────┘
                          Error Recovery
                              │
                    ┌─────────┴─────────┐
                    │  Recovery Flow    │
                    ├─────────┬─────────┤
                    │Check History      │
                    │Process Blocks     │
                    │Update RSS         │
                    └─────────┴─────────┘
```

## Environment Variables

- **./packages/frontend/.env** Place your gcp rss file link here ex: https://storage.googleapis.com/zksync-rss/rss/feed.xml
- **./packages/backend/.env** refer to the sample
- 

## Notes
- The initial setup (`process-historic-blocks`) should be run only once when setting up the service
- New blocks/events can be added to ./packages/backend/entry/processHistoricBlocks in the respective address/chain
- The recurring process (`process-blocks`) should be scheduled to run at regular intervals
- Both Docker configurations are available for containerized deployment
- Ensure proper configuration of GCP credentials and environment variables before running the containers
- Changes in behaviour could be made in packages/backend/shared/constants.ts
- Processing history is maintained for error tracking and recovery
- GCS files are configured with no-cache to ensure latest data
- Regular processing runs every 10 minutes via cron
- Error recovery can be performed without resetting the entire system

## Minimal System Requirements

### CPU
- Minimum: 2 CPU cores
- Recommended: 4 CPU cores
- Reason: 
  - Parallel processing of two networks
  - Event parsing and RSS generation
  - No heavy computation required

### RAM
- Minimum: 2GB RAM
- Recommended: 4GB RAM
- Reason:
  - RSS feed processing (~50MB)
  - State file management (~10MB)
  - Processing history (~100MB)
  - Node.js runtime (~500MB)
  - Buffer for concurrent operations

### Storage
- Minimum: 1GB
- Recommended: 5GB
- Reason:
  - RSS feed archives
  - Processing history archives
  - Temporary files
  - Node modules

### Network Bandwidth
- Minimum: 10 Mbps
- Recommended: 25 Mbps
- Reason:
  - RPC calls to Ethereum/ZKSync nodes
  - GCS file uploads/downloads
  - ~100 blocks processed every 10 minutes
  - Average RPC payload size ~2KB per block

### GPU
- Not required
- All operations are CPU/IO bound

### Notes
- No special hardware required
- Main bottleneck is network I/O for RPC calls
- Can run on basic cloud instances (e.g., e2-medium on GCP)
- Docker container typically uses ~500MB-1GB memory
