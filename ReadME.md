# ZKSync RSS Feed Generator

A service that monitors ZKSync and Ethereum networks for governance events and generates RSS feeds.

## Features

- Monitors both ZKSync and Ethereum networks for governance events
- Generates RSS feeds from blockchain events
- Stores state and RSS feeds in Google Cloud Storage
- Supports both real-time monitoring and historical block processing
- Automatic RSS feed updates when new events are found

## Setup

1. Clone the repository
2. Install dependencies
3. Create `.env` file in `packages/backend` with required environment variables
4. Create a GCP storage bucket with the following folder: zksync-rss
5. Configure your GKE workload identity on your cluster

### Option A: Running Without Docker

7. Run `npm run process-historic-blocks` to setup the feed
8. Setup a cron-job to run `npm run process-blocks` every x minutes

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

- `npm run process-blocks` - Process a specific block range
- `npm run process-historic-blocks` - Process predefined historical blocks
- `npm run frontend` - Start frontend development server
- `npm run lint` - Run linter check
- `npm run type-check` - Run TypeScript type checking
- `npm run build` - Build both frontend and backend
- `npm run clean` - Clean all dependencies and build artifacts

## Docker Commands

- `docker build -t zksync-rss-backend-init -f Dockerfile.init .` - Build initial setup image
- `docker run zksync-rss-backend-init` - Run initial setup
- `docker build -t zksync-rss-backend .` - Build main service image
- `docker run zksync-rss-backend` - Run the block processing service

## Project Structure

```
├── packages/
│   ├── backend/    # Backend service
│   └── frontend/   # Frontend application
├── Dockerfile      # Docker configuration for recurring process
├── Dockerfile.init # Docker configuration for initial setup
├── package.json
└── README.md
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
- Changes in behaviour could be made in packages/backend/shared/cons
