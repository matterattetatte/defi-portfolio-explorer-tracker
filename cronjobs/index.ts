

import { 
  createClient, 
  createROClient,
  type GolemBaseClient,
  type GolemBaseCreate,
  type GolemBaseUpdate,
  Annotation,
  Tagged
} from "golem-base-sdk";
import { tickToPrice } from '@uniswap/v3-sdk'
import { Token } from '@uniswap/sdk-core'
import { randomUUID } from "crypto";
import { Logger, ILogObj } from "tslog";
import * as dotenv from "dotenv";

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


function prepareLiquidityData(summary: any, ticks: any, currentTick: any) {
  const chainId = summary.chainId || 8453;
  const token0 = new Token(chainId, summary.token0.address, summary.token0.decimals, summary.token0.symbol);
  const token1 = new Token(chainId, summary.token1.address, summary.token1.decimals, summary.token1.symbol);

  let activeLiquidity = summary.liquidity; // current in-range liquidity

  return ticks.map((tick: any, i: number) => {
    activeLiquidity += parseFloat(tick.liquidityNet);

    const lowerTick = parseInt(tick.tickIdx, 10);
    const upperTick = ticks[i + 1]
      ? parseInt(ticks[i + 1].tickIdx, 10)
      : lowerTick + summary.tickSpacing;

    const priceLower = parseFloat(tickToPrice(token0, token1, lowerTick).toSignificant(6));
    const priceUpper = parseFloat(tickToPrice(token0, token1, upperTick).toSignificant(6));

    const sqrtLower = Math.sqrt(priceLower);
    const sqrtUpper = Math.sqrt(priceUpper);
    console.log('current tick', currentTick)
    const sqrtCurrent = Math.sqrt(
      parseFloat(tickToPrice(token0, token1, Number(currentTick)).toSignificant(6))
    );

    let token0Amount = 0;
    let token1Amount = 0;

    if (sqrtCurrent <= sqrtLower) {
      // Price below this tick’s range → all in token0
      token0Amount = activeLiquidity * (sqrtUpper - sqrtLower) / (sqrtLower * sqrtUpper);
    } else if (sqrtCurrent >= sqrtUpper) {
      // Price above this tick’s range → all in token1
      token1Amount = activeLiquidity * (sqrtUpper - sqrtLower);
    } else {
      // Price within this tick range → both tokens
      token0Amount = activeLiquidity * (sqrtUpper - sqrtCurrent) / (sqrtCurrent * sqrtUpper);
      token1Amount = activeLiquidity * (sqrtCurrent - sqrtLower);
    }

    const totalAmount = token0Amount + token1Amount;

    return {
      tickIdx: lowerTick,
      priceLower,
      priceUpper,
      totalAmount,
    };
  }).filter(({ totalAmount }: any) => isFinite(totalAmount))
}

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


  // TODO: WE WANT TO ITERATE THROUGH AN ARRAY OF LPSS!!!
  // const lps = [{ chain: 'base', exchange: 'uniswap', poolAddress: '0x0...' }]
  // future: store the list of

  // fetching snapshot 1once an hour
  const response = await fetch('https://app.metrix.finance/api/trpc/exchanges.getSimulatePool,exchanges.getPoolTicks?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22exchange%22%3A%22uniswap%22%2C%22network%22%3A%22base%22%2C%22poolAddress%22%3A%220xd0b53D9277642d899DF5C87A3966A349A798F224%22%2C%22apiKey%22%3A1%7D%7D%2C%221%22%3A%7B%22json%22%3A%7B%22exchange%22%3A%22uniswap%22%2C%22network%22%3A%22base%22%2C%22poolAddress%22%3A%220xd0b53D9277642d899DF5C87A3966A349A798F224%22%2C%22token0Decimals%22%3A18%2C%22token1Decimals%22%3A18%7D%7D%2C%222%22%3A%7B%22json%22%3A%7B%22apiKey%22%3A1%2C%22calculationRange%22%3A%2290%22%2C%22coinGeckoId%22%3A%22%22%7D%7D%2C%223%22%3A%7B%22json%22%3A%7B%22exchange%22%3A%22uniswap%22%2C%22network%22%3A%22base%22%2C%22poolAddress%22%3A%220xd0b53D9277642d899DF5C87A3966A349A798F224%22%2C%22feeTier%22%3A%22100%22%2C%22apiKey%22%3A1%2C%22baseTokenAddress%22%3A%22%22%7D%7D%7D').then((r) => r.json())
  // const response = await fetch('https://app.metrix.finance/api/trpc/exchanges.getSimulatePool,exchanges.getPoolTicks,coinGecko.getTokenPrices,exchanges.getPoolHistory?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22exchange%22%3A%22uniswap%22%2C%22network%22%3A%22ethereum%22%2C%22poolAddress%22%3A%220x531b6a4b3f962208ea8ed5268c642c84bb29be0b%22%2C%22apiKey%22%3A1%7D%7D%2C%221%22%3A%7B%22json%22%3A%7B%22exchange%22%3A%22uniswap%22%2C%22network%22%3A%22ethereum%22%2C%22poolAddress%22%3A%220x531b6a4b3f962208ea8ed5268c642c84bb29be0b%22%2C%22token0Decimals%22%3A18%2C%22token1Decimals%22%3A18%7D%7D%2C%222%22%3A%7B%22json%22%3A%7B%22apiKey%22%3A1%2C%22calculationRange%22%3A%2290%22%2C%22coinGeckoId%22%3A%22%22%7D%7D%2C%223%22%3A%7B%22json%22%3A%7B%22exchange%22%3A%22uniswap%22%2C%22network%22%3A%22ethereum%22%2C%22poolAddress%22%3A%220x531b6a4b3f962208ea8ed5268c642c84bb29be0b%22%2C%22feeTier%22%3A%22100%22%2C%22apiKey%22%3A1%2C%22baseTokenAddress%22%3A%22%22%7D%7D%7D').then((r) => r.json())

  const { 
      0: { result: { data: { json: summary } } },
      1: { result: { data: { json: lpDistribution} } },
  } = response


  console.log('summary', summary)

const targetTick = Number(summary.tick);

const tickArrIdxForCurentPrice = lpDistribution.ticks.reduce((acc: any, curr: any, currentIndex: any) => {
    const currentDiff = Math.abs(curr.tickIdx - targetTick);
  // If acc is null (first iteration) or current difference is smaller, update accumulator
    if (acc === null || currentDiff < acc.diff) {
      return { idx: currentIndex, diff: currentDiff };
    }
    return acc;
  }, null).idx;

  const lpData = prepareLiquidityData(summary, lpDistribution.ticks.slice(tickArrIdxForCurentPrice - 50, tickArrIdxForCurentPrice + 50), summary.tick)

  // use timestamp as annotation, restu jsut a json stringify for the datafield!!!!!
  // 6. BATCH OPERATIONS - Create multiple entities
  const now = new Date()
  now.setMinutes(0, 0, 0);
  const batchEntities: GolemBaseCreate[] = lpData.map(({ priceLower, priceUpper, totalAmount }: any, i: number) => ({
    data: new TextEncoder().encode(JSON.stringify({ priceLower, priceUpper, totalAmount })),
    btl: 1296000,  // Block-To-Live ~30 days (each block ~2 seconds)
    numericAnnotations: [
      new Annotation("sequence", i + 1),  // Start from 1 per your SDK note
      new Annotation("timestamp", now.getTime()), // unix timestamp
    ],
    stringAnnotations: [
      new Annotation("type", "lpSnapShot"), 
      new Annotation("lpAddress", summary.address), 
    ]
  }));

  console.log('hehehe', batchEntities.length)

  const batchReceipts = await client.createEntities(batchEntities);

  const ownerEntities = await client.queryEntities(`$owner = "${ownerAddress}" && lpAddress = "${summary.address}" && type = "lpSnapshot"`)

  const decoder = new TextDecoder()

  for (const entity of ownerEntities) {
    const data = JSON.parse(decoder.decode(entity.storageValue))
    // console.log(`Entity ${entity.entityKey}: ${data}`)
    // const { stringAnnotations, numericAnnotations } = await client.getEntityMetaData(entity.entityKey)
    // console.log('temp', data)
  }

  // Clean exit
  process.exit(0);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});