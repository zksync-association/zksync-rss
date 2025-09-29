import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import {
  uploadToGCS,
  GCS_BUCKET_NAME
} from "~/shared";
import { 
  processSpecificBlockRanges, 
  downloadStateFile, 
  uploadStateFile,
} from "../entry/processBlockRange";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Test configuration
const TEST_OUTPUT_DIR = path.join(__dirname, "../data/test-output");
const TEST_GCS_PATH = "test-feeds";

/**
 * Test function that processes a specified block range and guarantees saving to GCP
 */
async function testBlockRangeWithGcp(
  networkName: "Ethereum Mainnet" | "ZKSync",
  startBlock: number,
  endBlock: number,
  options: {
    saveTestInfo?: boolean;
    updateRssFeed?: boolean;
    testLabel?: string;
  } = {}
): Promise<void> {
  const timestamp = Date.now();
  const testId = options.testLabel || `${networkName}-${startBlock}-${endBlock}-${timestamp}`;
  
  try {
    console.log(`🧪 Running GCP integration test ${testId}`);
    console.log(`📊 Processing ${networkName} blocks ${startBlock} to ${endBlock}`);
    
    // Ensure test output directory exists
    if (!fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    }
    
    // Always download current state from GCP
    await downloadStateFile();
    console.log(`✅ Downloaded current state from GCP`);
    
    // Process the block range with full GCP integration
    const foundEvents = await processSpecificBlockRanges(
      networkName,
      startBlock,
      endBlock,
      {
        skipStateUpdate: false, // Never skip state updates in GCP test
        updateFeed: options.updateRssFeed !== false
      }
    );
    
    // Upload state back to GCP (even though processSpecificBlockRanges should have done this)
    await uploadStateFile();
    console.log(`✅ Uploaded state to GCP`);
    
    // Log results
    if (foundEvents) {
      console.log(`🎉 Found events in block range ${startBlock}-${endBlock}`);
    } else {
      console.log(`ℹ️ No events found in block range ${startBlock}-${endBlock}`);
    }
    
    // Save test info to GCP if requested
    if (options.saveTestInfo) {
      const testInfo = {
        testId,
        networkName,
        startBlock,
        endBlock,
        timestamp: new Date().toISOString(),
        foundEvents,
        options
      };
      
      const testInfoPath = path.join(TEST_OUTPUT_DIR, `test-info-${testId}.json`);
      fs.writeFileSync(testInfoPath, JSON.stringify(testInfo, null, 2));
      
      await uploadToGCS(
        GCS_BUCKET_NAME,
        testInfoPath,
        `${TEST_GCS_PATH}/test-info-${testId}.json`
      );
      console.log(`✅ Uploaded test info to GCS: ${TEST_GCS_PATH}/test-info-${testId}.json`);
    }
    
    // Save and upload feed
    const feedPath = path.join(__dirname, "../data/feed.xml");
    if (fs.existsSync(feedPath)) {
      const testFeedPath = path.join(TEST_OUTPUT_DIR, `test-feed-${testId}.xml`);
      fs.copyFileSync(feedPath, testFeedPath);
      
      await uploadToGCS(
        GCS_BUCKET_NAME,
        testFeedPath,
        `${TEST_GCS_PATH}/test-feed-${testId}.xml`
      );
      console.log(`✅ Uploaded test feed to GCS: ${TEST_GCS_PATH}/test-feed-${testId}.xml`);
    }
    
  } catch (error) {
    console.error(`❌ GCP Test failed:`, error);
    // Create error log
    const errorInfo = {
      testId,
      networkName,
      startBlock,
      endBlock,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    };
    
    const errorPath = path.join(TEST_OUTPUT_DIR, `error-${testId}.json`);
    fs.writeFileSync(errorPath, JSON.stringify(errorInfo, null, 2));
    
    await uploadToGCS(
      GCS_BUCKET_NAME,
      errorPath,
      `${TEST_GCS_PATH}/error-${testId}.json`
    ).catch(e => console.error("Failed to upload error info:", e));
    
    throw error;
  }
}

/**
 * Run the test with command line arguments
 */
async function runTest() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  // Extract options
  const saveTestInfo = args.includes("--save-info");
  const skipRssFeedUpdate = args.includes("--skip-rss-update");
  const label = args.find(arg => arg.startsWith("--label="))?.split("=")[1];
  
  // Remove flag arguments
  const cleanArgs = args.filter(arg => !arg.startsWith("--"));
  
  const networkArg = cleanArgs[0]?.toLowerCase();
  const network = networkArg === "ethereum" ? "Ethereum Mainnet" : 
               networkArg === "zksync" ? "ZKSync" : 
               "ZKSync"; // Default to ZKSync
  
  // Extract numeric arguments
  const startBlockArg = cleanArgs.find((arg, index) => index > 0 && !isNaN(Number(arg)));
  const endBlockArg = cleanArgs.find((arg, index) => {
    return index > 0 && startBlockArg !== undefined && 
           cleanArgs.indexOf(startBlockArg) !== -1 && 
           index > cleanArgs.indexOf(startBlockArg) && 
           !isNaN(Number(arg));
  });
  
  // Parse block numbers with fallbacks
  const startBlock = startBlockArg ? parseInt(startBlockArg, 10) : (network === "Ethereum Mainnet" ? 18500000 : 19500000);
  const endBlock = endBlockArg ? parseInt(endBlockArg, 10) : (startBlock + 100); // Default smaller range for GCP tests
  
  console.log(`🚀 Running GCP integration test for ${network} from block ${startBlock} to ${endBlock}`);
  console.log(`⚠️ WARNING: This will update your production GCP state! ⚠️`);
  
  await testBlockRangeWithGcp(
    network as "Ethereum Mainnet" | "ZKSync", 
    startBlock, 
    endBlock,
    {
      saveTestInfo,
      updateRssFeed: !skipRssFeedUpdate,
      testLabel: label
    }
  );
  
  console.log("✅ GCP integration test completed successfully");
}

// Run the test
runTest().catch(error => {
  console.error("💥 GCP test failed with error:", error);
  process.exit(1);
}); 