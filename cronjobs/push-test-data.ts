import { 
  createROClient,
  type GolemBaseCreate,
  Annotation,
  Tagged
} from "golem-base-sdk";
import { Logger, ILogObj } from "tslog";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Configure logger
const logger = new Logger<ILogObj>({
  name: "Push Test Data",
  minLevel: 3 // info level
});

let client: any;

// Initialize Golem client
async function initializeClient() {
  try {
    
    client = await createROClient(
      60138453033,
      "https://ethwarsaw.holesky.golemdb.io/rpc",
      "wss://ethwarsaw.holesky.golemdb.io/rpc/ws",
      logger
    );
    
    console.log("Connected to Golem DB!");

    return client;
  } catch (error) {
    console.error("❌ Error initializing Golem client:", error);
    throw error;
  }
}

// Function to query all entities owned by a wallet address
async function queryWalletEntities(
  walletAddress: string,
) {
  try {
    if (!client) {
      await initializeClient();
    }

    const allTransactionsQuery = await client.queryEntities(`$owner = "${walletAddress}"`);
    console.log(`📈 Found ${allTransactionsQuery.length} total entities for wallet ${walletAddress}`);
    
    const allTransactions = new Map();
    
    // Process in batches of 10 with 100ms delay between batches
    const BATCH_SIZE = 10;
    const DELAY_MS = 10;
    
    for (let i = 0; i < allTransactionsQuery.length; i += BATCH_SIZE) {
      const batch = allTransactionsQuery.slice(i, i + BATCH_SIZE);
    
      await Promise.all(batch.map(async (entry: any) => {
        const data = JSON.parse(new TextDecoder().decode(entry.storageValue));
        const { stringAnnotations, numericAnnotations } = await client.getEntityMetaData(entry.entityKey);
        const timestampAnnotation = numericAnnotations?.find((ann: any) => ann.key === "timestamp");
        const lpAddressAnnotation = stringAnnotations?.find((ann: any) => ann.key === "lpAddress");
        
        const timestampValue = timestampAnnotation ? timestampAnnotation.value : null;
        const lpAddressValue = lpAddressAnnotation ? lpAddressAnnotation.value : null;

              
        if (timestampValue !== null && lpAddressValue !== null) {
          // Use tuple [timestamp, lpAddress] as key
          const key = [timestampValue, lpAddressValue] as [number, string];
          allTransactions.set(key, {
            priceLower: data.priceLower,
            priceUpper: data.priceUpper,
            totalAmount: data.totalAmount
          });
        }
      }));
      
      // Add delay between batches (except for the last batch)
      if (i + BATCH_SIZE < allTransactionsQuery.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
      
      // Progress indicator
      console.log(`📊 Processed ${Math.min(i + BATCH_SIZE, allTransactionsQuery.length)}/${allTransactionsQuery.length} entities`);
    }
    
    return allTransactions;
  } catch (error) {
    console.error("❌ Error querying wallet transactions:", error);
    throw error;
  }
}

// Run the script
async function main() {
  try {

    const walletAddress = "0xa10470C0F296E598945710b3100ca4CC2B43bA20";
    
    console.log("🚀 Calling queryWalletEntities...");
    console.log("=".repeat(50));
    const transactionMap = await queryWalletEntities(walletAddress);
    console.log(`✅ Received ${transactionMap.size} total transactions`);
    
    // Print the transactionMap
    console.log("\n📊 Transaction Map:");
    console.log(transactionMap);

    process.exit(0);
  } catch (error) {
    console.error("Script failed:", error);
    process.exit(1);
  }
}

main();
