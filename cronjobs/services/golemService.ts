import { 
  createClient, 
  type GolemBaseClient,
  type GolemBaseCreate,
  Annotation,
  Tagged
} from "golem-base-sdk";
import { Logger, ILogObj } from "tslog";
import { PoolSnapshot, LiquidityData } from './poolDataService.js';

export interface QueryOptions {
  poolAddress: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
}

export interface StoredPoolData {
  poolAddress: string;
  timestamp: Date;
  tickIdx: number;
  priceLower: number;
  priceUpper: number;
  totalAmount: number;
  token0Amount: number;
  token1Amount: number;
}

class GolemService {
  private client: GolemBaseClient | null = null;
  private logger: Logger<ILogObj>;

  constructor() {
    const logLevelMap: Record<string, number> = {
      silly: 0, trace: 1, debug: 2, info: 3, warn: 4, error: 5, fatal: 6
    };

    this.logger = new Logger<ILogObj>({
      name: "GolemService",
      minLevel: logLevelMap[process.env.LOG_LEVEL as keyof typeof logLevelMap] || logLevelMap.info
    });
  }

  async initialize(): Promise<void> {
    if (this.client) {
      return; // Already initialized
    }

    const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
    if (!PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY environment variable is required");
    }

    const privateKeyHex = PRIVATE_KEY.replace(/^0x/, "");
    const privateKey = new Uint8Array(
      privateKeyHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );
    
    this.client = await createClient(
      60138453033,
      new Tagged("privatekey", privateKey),
      "https://ethwarsaw.holesky.golemdb.io/rpc",
      "wss://ethwarsaw.holesky.golemdb.io/rpc/ws",
      this.logger
    );

    const ownerAddress = await this.client.getOwnerAddress();
    this.logger.info(`Connected to Golem DB! Owner: ${ownerAddress}`);

    // Check balance
    const balanceBigint = await this.client.getRawClient().httpClient.getBalance({ address: ownerAddress });
    const balance = Number(balanceBigint) / 10**18;
    this.logger.info(`Account balance: ${balance} ETH`);

    if (balance === 0) {
      this.logger.warn("Account balance is 0 ETH. Please acquire test tokens from the faucet.");
    }
  }

  async storePoolSnapshot(snapshot: PoolSnapshot, tickRange: { start: number, end: number } = { start: -50, end: 50 }): Promise<void> {
    if (!this.client) {
      throw new Error("GolemService not initialized. Call initialize() first.");
    }

    // Round timestamp to the nearest hour for consistent querying
    const roundedTimestamp = new Date(snapshot.timestamp);
    roundedTimestamp.setMinutes(0, 0, 0);

    // Find current price tick (simplified - you may want to get this from the pool data)
    const currentPriceTick = 0; // TODO: Calculate based on current price
    
    const relevantLiquidityData = snapshot.liquidityData.slice(
      Math.max(0, currentPriceTick + tickRange.start),
      Math.min(snapshot.liquidityData.length, currentPriceTick + tickRange.end)
    );

    const entities: GolemBaseCreate[] = relevantLiquidityData.map((data, i) => ({
      data: new TextEncoder().encode(`Pool snapshot: ${snapshot.poolAddress} at ${roundedTimestamp.toISOString()}`),
      btl: 1000, // Blocks to live - adjust as needed
      stringAnnotations: [
        new Annotation("type", "pool_snapshot"),
        new Annotation("poolAddress", snapshot.poolAddress),
        new Annotation("timestamp", roundedTimestamp.toISOString()),
        new Annotation("tickIdx", data.tickIdx.toString()),
        new Annotation("priceLower", data.priceLower.toString()),
        new Annotation("priceUpper", data.priceUpper.toString()),
        new Annotation("totalAmount", data.totalAmount.toString()),
        new Annotation("token0Amount", Math.abs(data.token0Amount).toString()),
        new Annotation("token1Amount", Math.abs(data.token1Amount).toString()),
        new Annotation("token0Symbol", snapshot.summary.token0.symbol),
        new Annotation("token1Symbol", snapshot.summary.token1.symbol),
      ],
      numericAnnotations: [
        new Annotation("sequence", i + 1),
        new Annotation("timestampUnix", Math.floor(roundedTimestamp.getTime() / 1000)),
      ]
    }));

    try {
      const receipts = await this.client.createEntities(entities);
      this.logger.info(`Stored ${receipts.length} liquidity data points for pool ${snapshot.poolAddress}`);
    } catch (error) {
      this.logger.error(`Error storing pool snapshot:`, error);
      throw error;
    }
  }

  async queryPoolData(options: QueryOptions): Promise<StoredPoolData[]> {
    if (!this.client) {
      throw new Error("GolemService not initialized. Call initialize() first.");
    }

    let queryString = `type = "pool_snapshot" && poolAddress = "${options.poolAddress}"`;
    
    if (options.startTime) {
      const startUnix = Math.floor(options.startTime.getTime() / 1000);
      queryString += ` && timestampUnix >= ${startUnix}`;
    }
    
    if (options.endTime) {
      const endUnix = Math.floor(options.endTime.getTime() / 1000);
      queryString += ` && timestampUnix <= ${endUnix}`;
    }

    try {
      const results = await this.client.queryEntities(queryString);
      this.logger.info(`Found ${results.length} entities matching query`);

      return results.map((result: any) => {
        // Extract data from annotations
        const getStringAnnotation = (key: string) => 
          result.stringAnnotations?.find((ann: any) => ann.name === key)?.value || "";
        
        const getNumericAnnotation = (key: string) => 
          result.numericAnnotations?.find((ann: any) => ann.name === key)?.value || 0;

        return {
          poolAddress: getStringAnnotation("poolAddress"),
          timestamp: new Date(getStringAnnotation("timestamp")),
          tickIdx: parseInt(getStringAnnotation("tickIdx")),
          priceLower: parseFloat(getStringAnnotation("priceLower")),
          priceUpper: parseFloat(getStringAnnotation("priceUpper")),
          totalAmount: parseFloat(getStringAnnotation("totalAmount")),
          token0Amount: parseFloat(getStringAnnotation("token0Amount")),
          token1Amount: parseFloat(getStringAnnotation("token1Amount")),
        };
      })
      .slice(0, options.limit || 1000)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      this.logger.error(`Error querying pool data:`, error);
      throw error;
    }
  }

  async getPoolDataForTimeRange(
    poolAddress: string, 
    startTime: Date, 
    endTime: Date
  ): Promise<{ [timestamp: string]: StoredPoolData[] }> {
    const data = await this.queryPoolData({
      poolAddress,
      startTime,
      endTime,
      limit: 10000
    });

    // Group by timestamp
    return data.reduce((acc, item) => {
      const timeKey = item.timestamp.toISOString();
      if (!acc[timeKey]) {
        acc[timeKey] = [];
      }
      acc[timeKey].push(item);
      return acc;
    }, {} as { [timestamp: string]: StoredPoolData[] });
  }

  async getLatestPoolData(poolAddress: string): Promise<StoredPoolData[]> {
    const data = await this.queryPoolData({
      poolAddress,
      limit: 100
    });

    if (data.length === 0) return [];

    // Get the latest timestamp
    const latestTimestamp = data[0].timestamp;
    
    // Return all data from that timestamp
    return data.filter(item => 
      item.timestamp.getTime() === latestTimestamp.getTime()
    );
  }
}

export const golemService = new GolemService();