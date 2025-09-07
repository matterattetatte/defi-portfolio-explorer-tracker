

import { 
  createClient, 
  createROClient,
  type GolemBaseClient,
  type GolemBaseCreate,
  type GolemBaseUpdate,
  Annotation,
  Tagged
} from "golem-base-sdk";
import { Logger, ILogObj } from "tslog";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

import lps from './lpMockData'


let client: any

const logLevelMap: Record<string, number> = {
  silly: 0,
  trace: 1,
  debug: 2,
  info: 3,
  warn: 4,
  error: 5,
  fatal: 6
};

const logger = new Logger<ILogObj>({
  name: "GolemDB Example",
  minLevel: logLevelMap[process.env.LOG_LEVEL as keyof typeof logLevelMap] || logLevelMap.info
});



const mockDataWrite = async () => {
  const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x...";
  const privateKeyHex = PRIVATE_KEY.replace(/^0x/, "");
  const privateKey = new Uint8Array(
    privateKeyHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );

  client = await createClient(
    60138453033,
    new Tagged("privatekey", privateKey),
    "https://ethwarsaw.holesky.golemdb.io/rpc",
    "wss://ethwarsaw.holesky.golemdb.io/rpc/ws",
    logger
  )

    const ownerAddress = await client.getOwnerAddress();

    // delete all Data
    const ownerEntities = await client.queryEntities(`$owner = "${ownerAddress}"`)

    const entityKeys = ownerEntities.map((oe: any) => oe.entityKey)

    console.log('Deleting entities....', )
    // Delete entities in smaller batches to avoid 413 errors
    const deleteBatchSize = 100;
    for (let i = 0; i < entityKeys.length; i += deleteBatchSize) {
      const batch = entityKeys.slice(i, i + deleteBatchSize);
      console.log(`Deleting batch ${Math.floor(i/deleteBatchSize) + 1}/${Math.ceil(entityKeys.length/deleteBatchSize)} (${batch.length} entities)`);
      await client.deleteEntities(batch);
      // Add a small delay between batches
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    console.log(`Deleted ${entityKeys.length} entities. Now creating mock data...`)

    const today = new Date()
    today.setMinutes(0, 0, 0);
    const entitiesToBatch = lps.flatMap((lp: any) => {
      // process.exit(1)
        return lp.ticks.map(({ priceLower, priceUpper, totalAmount }: any, i: number) => ({
            data: new TextEncoder().encode(JSON.stringify({ priceLower, priceUpper, totalAmount })),
            btl: 1296000,  // Block-To-Live ~30 days (each block ~2 seconds)
            numericAnnotations: [
            new Annotation("sequence", i + 1),  // Start from 1 per your SDK note
            new Annotation("timestamp", lp.timestamp), // minux 30 days from now for mocking
            // new Annotation("timestamp", new Date(new Date().setMinutes(0,0,0) - i * 24*60*60*1000).getTime()), // minux 30 days from now for mocking
            ],
            stringAnnotations: [
            new Annotation("type", "lpSnapShot"), 
            new Annotation("lpAddress", lp.poolAddress), 
            ]
        }))
      })

      // Create entities in smaller batches to avoid 413 errors
      const batchSize = 100; // Reduced from 1000 to 100
      for (let i = 0; i < entitiesToBatch.length; i += batchSize) {
        const batch = entitiesToBatch.slice(i, i + batchSize);
        console.log(`Creating batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(entitiesToBatch.length/batchSize)} (${batch.length} entities)`);
        try {
          await client.createEntities(batch);
        } catch (error) {
          console.error(`Error creating batch ${Math.floor(i/batchSize) + 1}:`, error);
          // If batch is still too large, try even smaller batches
          if (error.message?.includes('413') || error.message?.includes('Payload Too Large')) {
            console.log('Batch too large, splitting into smaller chunks...');
            const smallerBatchSize = 50;
            for (let j = 0; j < batch.length; j += smallerBatchSize) {
              const smallerBatch = batch.slice(j, j + smallerBatchSize);
              await client.createEntities(smallerBatch);
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          } else {
            throw error;
          }
        }
        // Add a small delay between batches to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
}

mockDataWrite().then(() => {
    console.log('Done')
    process.exit(0)
})