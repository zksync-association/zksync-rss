# Block Processing Tests

This directory contains tests for the block processing functionality that can be run with or without GCP integration.

## Available Tests

There are two main test files:

1. **`processBlockRangeTest.ts`**: Test block processing with optional GCP integration
2. **`processBlockRangeGcpTest.ts`**: Test block processing with guaranteed GCP integration

## Running the Block Range Test (Local or Optional GCP)

The `processBlockRangeTest.ts` file allows you to test the block processing functionality with specified block ranges, using the actual production code from `processBlockRange.ts`.

### Usage

```bash
# Use default settings (ZKSync network, default block range)
npm run test:blocks

# Specify network and block range (with GCP integration - updates real state)
npm run test:blocks -- ethereum 18500000 18501000
npm run test:blocks -- zksync 19500000 19501000

# Specify network and block range (local only - no GCP updates)
npm run test:blocks -- ethereum 18500000 18501000 --skip-gcp
npm run test:blocks -- zksync 19500000 19501000 --local
```

### Command Line Arguments

1. Network: `ethereum` or `zksync` (default: `zksync`)
2. Start Block: block number to start processing from (default: network-specific)
3. End Block: block number to end processing at (default: start + 1000)
4. Flags:
   - `--skip-gcp` or `--local`: Skip GCP state updates (for testing without affecting production)

## Running the GCP Integration Test

The `processBlockRangeGcpTest.ts` file always saves results to GCP and is designed for integration testing with your production environment.

### Usage

```bash
# Use default settings (ZKSync network, default block range)
npm run test:blocks:gcp

# Specify network
npm run test:blocks:gcp:eth -- 18500000 18501000
npm run test:blocks:gcp:zk -- 19500000 19501000

# With additional options
npm run test:blocks:gcp -- ethereum 18500000 18501000 --save-info --label=my-test
```

### Command Line Arguments

1. Network: `ethereum` or `zksync` (default: `zksync`)
2. Start Block: block number to start processing from (default: network-specific)
3. End Block: block number to end processing at (default: start + 100)
4. Flags:
   - `--save-info`: Save detailed test information to GCP
   - `--skip-rss-update`: Skip RSS feed updates
   - `--label=<name>`: Add a custom label to the test outputs

### GCP Test Outputs

All GCP test outputs are saved to:

- Local directory: `packages/backend/data/test-output/`
- GCS bucket: `test-feeds/` folder with:
  - `test-feed-<testId>.xml`: The test RSS feed
  - `test-info-<testId>.json`: Test metadata (if `--save-info` is used)
  - `error-<testId>.json`: Error details if the test fails

### Important Notes on GCP Tests

⚠️ **WARNING**: The GCP integration test WILL update your production GCP state, including:
- State files
- Processing history
- RSS feeds

Only run these tests when you're confident in the block ranges you're processing and understand the implications for your production environment.

## What These Tests Do

These tests use the **actual production code** from `processBlockRange.ts` to:

1. Process the specified block range using the same batch processing logic
2. Collect events using the same event processing logic
3. Add events to the RSS feed using the same RSS feed generation logic
4. Optionally or mandatorily update GCP state files (state, history, and RSS feed)

### How It Works

The test leverages a minimal set of changes to `processBlockRange.ts` that:

1. Exports key functions for testing
2. Adds optional flags to control state updates
3. Provides a clean interface for testing via the `processSpecificBlockRanges` function

This approach ensures that we're testing the actual production code with minimal modifications.

## Summary

These tests will help you:

1. **Debug RSS Feed Issues**: Test specific block ranges where issues have been reported
2. **Verify Event Processing**: Confirm that events are correctly detected and processed
3. **Test RSS Feed Generation**: Ensure the RSS feed is correctly generated with events
4. **Control GCP Impact**: Test with or without updating production GCP state
5. **Troubleshoot Archive Issues**: Specifically target the RSS archive functionality

By using the actual production code with minimal modifications, we ensure that tests provide accurate results that reflect real-world behavior.

With the convenient npm scripts, you can quickly test different networks and block ranges:

- `npm run test:blocks` - Default test (ZKSync network)
- `npm run test:blocks:eth` - Test on Ethereum Mainnet
- `npm run test:blocks:zk` - Test on ZKSync Era
- `npm run test:blocks:local` - Test locally without GCP updates
- `npm run test:blocks:gcp` - Test with GCP integration (ZKSync)
- `npm run test:blocks:gcp:eth` - Test with GCP integration (Ethereum)
- `npm run test:blocks:gcp:zk` - Test with GCP integration (ZKSync)

Combine these with specific block ranges to troubleshoot issues:
```bash
npm run test:blocks:zk -- 19580000 19580100
npm run test:blocks:gcp:eth -- 18500000 18500100 --save-info
``` 