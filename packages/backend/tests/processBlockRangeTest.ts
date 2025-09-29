import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import {
  uploadToGCS,
  GCS_BUCKET_NAME,
} from "../shared";
import { 
  processSpecificBlockRanges, 
  downloadStateFile, 
  uploadStateFile 
} from "../entry/processBlockRange";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Test configuration
const TEST_OUTPUT_DIR = path.join(__dirname, "../data/test-output");

/**
 * Test function that processes a specified block range and saves results to GCP
 */
async function testBlockRange(
  networkName: "Ethereum Mainnet" | "ZKSync",
  startBlock: number,
  endBlock: number,
  options: {
    skipGcpStateSave?: boolean;
    skipRssFeedUpdate?: boolean;
  } = {}
): Promise<void> {
  try {
    console.log(`🧪 Testing ${networkName} blocks ${startBlock} to ${endBlock}`);
    
    // Ensure test output directory exists
    if (!fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    }
    
    // Download current state from GCP if needed
    if (!options.skipGcpStateSave) {
      await downloadStateFile();
    }
    
    // Process the block range (this will handle all the event collection and RSS updates)
    const foundEvents = await processSpecificBlockRanges(
      networkName,
      startBlock,
      endBlock,
      {
        skipStateUpdate: options.skipGcpStateSave,
        updateFeed: !options.skipRssFeedUpdate
      }
    );
    
    console.log(foundEvents ? 
      `✅ Successfully found and processed events in range ${startBlock}-${endBlock}` : 
      `ℹ️ No events found in range ${startBlock}-${endBlock}`);
    
    // Upload state to GCP if needed
    if (!options.skipGcpStateSave) {
      await uploadStateFile();
    }
    
    // Save the RSS feed to our test output directory
    const feedPath = path.join(__dirname, "../data/feed.xml");
    if (fs.existsSync(feedPath)) {
      const testOutputPath = path.join(TEST_OUTPUT_DIR, `test-feed-${networkName}-${startBlock}-${endBlock}.xml`);
      fs.copyFileSync(feedPath, testOutputPath);
      console.log(`📄 Test feed saved to ${testOutputPath}`);
      
      // Upload to GCS as a test feed if needed
      if (!options.skipGcpStateSave) {
        await uploadToGCS(
          GCS_BUCKET_NAME,
          testOutputPath,
          `test-feeds/test-feed-${networkName}-${startBlock}-${endBlock}-${Date.now()}.xml`
        );
        console.log(`☁️ Test feed uploaded to GCS`);
      }
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
}

/**
 * Run the test with command line arguments
 */
async function runTest() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const skipGcp = args.includes("--skip-gcp") || args.includes("--local");

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
  const endBlock = endBlockArg ? parseInt(endBlockArg, 10) : (startBlock + 1000);
  
  console.log(`🧪 Running test on ${network} from block ${startBlock} to ${endBlock}`);
  if (skipGcp) {
    console.log(`📋 Local mode: Skipping GCP state updates`);
  }
  
  await testBlockRange(
    network as "Ethereum Mainnet" | "ZKSync", 
    startBlock, 
    endBlock,
    { skipGcpStateSave: skipGcp }
  );
  
  console.log("✅ Test completed successfully");
}

// Run the test
runTest().catch(error => {
  console.error("💥 Test failed with error:", error);
  process.exit(1);
}); 