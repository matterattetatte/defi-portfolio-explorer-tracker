

import { 
  createClient, 
  type GolemBaseClient,
  type GolemBaseCreate,
  type GolemBaseUpdate,
  Annotation,
  Tagged
} from "golem-base-sdk";
import { randomUUID } from "crypto";
import { Logger, ILogObj } from "tslog";
import * as dotenv from "dotenv";

const response = await fetch('https://app.metrix.finance/api/trpc/exchanges.getSimulatePool,exchanges.getPoolTicks,coinGecko.getTokenPrices,exchanges.getPoolHistory?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22exchange%22%3A%22uniswap%22%2C%22network%22%3A%22base%22%2C%22poolAddress%22%3A%220xd0b53D9277642d899DF5C87A3966A349A798F224%22%2C%22apiKey%22%3A1%7D%7D%2C%221%22%3A%7B%22json%22%3A%7B%22exchange%22%3A%22uniswap%22%2C%22network%22%3A%22base%22%2C%22poolAddress%22%3A%220xd0b53D9277642d899DF5C87A3966A349A798F224%22%2C%22token0Decimals%22%3A18%2C%22token1Decimals%22%3A18%7D%7D%2C%222%22%3A%7B%22json%22%3A%7B%22apiKey%22%3A1%2C%22calculationRange%22%3A%2290%22%2C%22coinGeckoId%22%3A%22%22%7D%7D%2C%223%22%3A%7B%22json%22%3A%7B%22exchange%22%3A%22uniswap%22%2C%22network%22%3A%22base%22%2C%22poolAddress%22%3A%220xd0b53D9277642d899DF5C87A3966A349A798F224%22%2C%22feeTier%22%3A%22100%22%2C%22apiKey%22%3A1%2C%22baseTokenAddress%22%3A%22%22%7D%7D%7D').then((r) => r.json())
// const response = await fetch('https://app.metrix.finance/api/trpc/exchanges.getSimulatePool,exchanges.getPoolTicks,coinGecko.getTokenPrices,exchanges.getPoolHistory?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22exchange%22%3A%22uniswap%22%2C%22network%22%3A%22ethereum%22%2C%22poolAddress%22%3A%220x531b6a4b3f962208ea8ed5268c642c84bb29be0b%22%2C%22apiKey%22%3A1%7D%7D%2C%221%22%3A%7B%22json%22%3A%7B%22exchange%22%3A%22uniswap%22%2C%22network%22%3A%22ethereum%22%2C%22poolAddress%22%3A%220x531b6a4b3f962208ea8ed5268c642c84bb29be0b%22%2C%22token0Decimals%22%3A18%2C%22token1Decimals%22%3A18%7D%7D%2C%222%22%3A%7B%22json%22%3A%7B%22apiKey%22%3A1%2C%22calculationRange%22%3A%2290%22%2C%22coinGeckoId%22%3A%22%22%7D%7D%2C%223%22%3A%7B%22json%22%3A%7B%22exchange%22%3A%22uniswap%22%2C%22network%22%3A%22ethereum%22%2C%22poolAddress%22%3A%220x531b6a4b3f962208ea8ed5268c642c84bb29be0b%22%2C%22feeTier%22%3A%22100%22%2C%22apiKey%22%3A1%2C%22baseTokenAddress%22%3A%22%22%7D%7D%7D').then((r) => r.json())

const { 
    0: { result: { data: { json: summary } } },
    1: { result: { data: { json: lpDistribution} } },
 } = response


console.log('summary', summary)
console.log('lp distr', lpDistribution)

// todo: zoom in by selecting the middle 100 ticks or whatever in order to store less than x amount of bytes in golem!
const ticks = lpDistribution.ticks


console.table(ticks.slice(0, 100))


// Load environment variables
dotenv.config();

// Configure logger
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

async function main() {
  // 1. INITIALIZE CLIENT
  const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x...";
  const privateKeyHex = PRIVATE_KEY.replace(/^0x/, "");
  const privateKey = new Uint8Array(
    privateKeyHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );
  
  const client = await createClient(
    60138453033,
    new Tagged("privatekey", privateKey),
    "https://ethwarsaw.holesky.golemdb.io/rpc",
    "wss://ethwarsaw.holesky.golemdb.io/rpc/ws",
    logger
  );
  
  console.log("Connected to Golem DB!");
  const ownerAddress = await client.getOwnerAddress();
  console.log(`Owner address: ${ownerAddress}`);

  // Get and check client account balance
  const balanceBigint = await client.getRawClient().httpClient.getBalance({ address: ownerAddress });
  const balance = Number(balanceBigint) / 10**18;
  console.log(`Client account balance: ${balance} ETH`);

  if (balance === 0) {
    console.warn("Warning: Account balance is 0 ETH. Please acquire test tokens from the faucet.");
  }

  // 2. CREATE - Single entity with annotations
  const id = randomUUID();
  const entity: GolemBaseCreate = {
    data: new TextEncoder().encode(JSON.stringify({
      message: "Hello from ETHWarsaw 2025!",
      timestamp: Date.now(),
      author: "Developer"
    })),
    btl: 300, // ~10 minutes (300 blocks * 2 seconds = 600 seconds)
    stringAnnotations: [
      new Annotation("type", "message"),
      new Annotation("event", "ethwarsaw"),
      new Annotation("id", id)
    ],
    numericAnnotations: [
      new Annotation("version", 1),
      new Annotation("timestamp", Date.now())
    ]
  };
  
  const createReceipts = await client.createEntities([entity]);
  const entityKey = createReceipts[0].entityKey;
  console.log(`Created entity: ${entityKey}`);
  
  // 3. QUERY - Find entity by annotations
  const queryResults = await client.queryEntities(`id = "${id}" && version = 1`);
  console.log(`Found ${queryResults.length} matching entities`);
  
  for (const result of queryResults) {
    const data = JSON.parse(new TextDecoder().decode(result.storageValue));
    console.log("Query result:", data);
  }

  // 6. BATCH OPERATIONS - Create multiple entities
  const batchEntities: GolemBaseCreate[] = [];
  for (let i = 0; i < 5; i++) {
    batchEntities.push({
      data: new TextEncoder().encode(`Batch message ${i}`),
      btl: 100,
      stringAnnotations: [
        new Annotation("type", "batch"),
        new Annotation("index", i.toString())
      ],
      numericAnnotations: [
        new Annotation("sequence", i + 1)  // Start from 1, not 0 (SDK bug with value 0)
      ]
    });
  }
  
  const batchReceipts = await client.createEntities(batchEntities);
  console.log(`Created ${batchReceipts.length} entities in batch`);
  
  // 7. BTL MANAGEMENT - Extend entity lifetime
  const extendReceipts = await client.extendEntities([{
    entityKey: entityKey,
    numberOfBlocks: 100
  }]);
  console.log(`Extended BTL to block: ${extendReceipts[0].newExpirationBlock}`);
  
  // Check metadata to verify BTL
  const metadata = await client.getEntityMetaData(entityKey);
  console.log(`Entity expires at block: ${metadata.expiresAtBlock}`);

  console.log("Complete!");
  
  // Clean exit
  process.exit(0);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});