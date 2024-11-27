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
3. Create `.env` file in `packages/backend` with:

## Available Scripts

- `npm run process-blocks` - Process a specific block range
- `npm run process-historic-blocks` - Process predefined historical blocks
- `npm run frontend` - Start frontend development server
- `npm run lint` - Run linter
- `npm run type-check` - Run TypeScript type checking
- `npm run build` - Build both frontend and backend
- `npm run clean` - Clean all dependencies and build artifacts

## Project Structure

├── packages/
│ ├── backend/ # Backend service
│ └── frontend/ # Frontend application
├── package.json
└── README.md