import { tickToPrice } from '@uniswap/v3-sdk';
import { Token } from '@uniswap/sdk-core';

export interface PoolConfig {
  chain: string;
  exchange: string;
  poolAddress: string;
  network: string;
  feeTier: string;
}

export interface LiquidityData {
  tickIdx: number;
  priceLower: number;
  priceUpper: number;
  totalAmount: number;
  token0Amount: number;
  token1Amount: number;
}

export interface PoolSummary {
  token0: {
    address: string;
    symbol: string;
  };
  token1: {
    address: string;
    symbol: string;
  };
  tickSpacing: number;
}

export interface PoolSnapshot {
  poolAddress: string;
  timestamp: Date;
  summary: PoolSummary;
  liquidityData: LiquidityData[];
}

class PoolDataService {
  private readonly METRIX_BASE_URL = 'https://app.metrix.finance/api/trpc';

  async fetchPoolData(poolConfig: PoolConfig): Promise<PoolSnapshot> {
    const { exchange, network, poolAddress, feeTier } = poolConfig;
    
    const params = new URLSearchParams({
      batch: '1',
      input: JSON.stringify({
        "0": {
          json: {
            exchange,
            network,
            poolAddress,
            apiKey: 1
          }
        },
        "1": {
          json: {
            exchange,
            network,
            poolAddress,
            token0Decimals: 18,
            token1Decimals: 18
          }
        }
      })
    });

    const url = `${this.METRIX_BASE_URL}/exchanges.getSimulatePool,exchanges.getPoolTicks?${params}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch pool data: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      const { 
        0: { result: { data: { json: summary } } },
        1: { result: { data: { json: lpDistribution } } },
      } = data;

      const liquidityData = this.prepareLiquidityData(summary, lpDistribution.ticks);

      return {
        poolAddress,
        timestamp: new Date(),
        summary,
        liquidityData
      };
    } catch (error) {
      console.error(`Error fetching pool data for ${poolAddress}:`, error);
      throw error;
    }
  }

  private prepareLiquidityData(summary: PoolSummary, ticks: any[]): LiquidityData[] {
    const chainId = 8453; // Base chain
    const token0 = new Token(chainId, summary.token0.address, 18, summary.token0.symbol, summary.token0.symbol);
    const token1 = new Token(chainId, summary.token1.address, 18, summary.token1.symbol, summary.token1.symbol);

    return ticks.map((tick: any, i: number) => {
      const currentTick = parseInt(tick.tickIdx);
      const liquidity = parseFloat(tick.liquidityGross || tick.liquidityNet || 0);

      // Get next tick to calculate range
      const nextTick = ticks[i + 1];
      const nextTickIdx = nextTick ? parseInt(nextTick.tickIdx) : currentTick + summary.tickSpacing;

      try {
        const priceLower = parseFloat(tickToPrice(token0, token1, currentTick).toSignificant(6));
        const priceUpper = parseFloat(tickToPrice(token0, token1, nextTickIdx).toSignificant(6));
        
        const sqrtLower = Math.sqrt(priceLower);
        const sqrtUpper = Math.sqrt(priceUpper);
        
        const token0Amount = liquidity * (sqrtUpper - sqrtLower) / (sqrtUpper * sqrtLower);
        const token1Amount = liquidity * (sqrtUpper - sqrtLower);
        
        // Calculate total liquidity amount (you can adjust this calculation as needed)
        const totalAmount = Math.abs(token0Amount) + Math.abs(token1Amount);
        
        return {
          tickIdx: currentTick,
          priceLower,
          priceUpper,
          totalAmount,
          token0Amount,
          token1Amount,
        };
      } catch (error) {
        console.error(`Error processing tick ${currentTick}:`, error);
        return {
          tickIdx: currentTick,
          priceLower: 0,
          priceUpper: 0,
          totalAmount: 0,
          token0Amount: 0,
          token1Amount: 0,
        };
      }
    }).filter(data => data.token0Amount !== 0 || data.token1Amount !== 0);
  }

  async fetchMultiplePoolsData(poolConfigs: PoolConfig[]): Promise<PoolSnapshot[]> {
    const promises = poolConfigs.map(config => this.fetchPoolData(config));
    
    try {
      const results = await Promise.allSettled(promises);
      
      return results
        .filter((result): result is PromiseFulfilledResult<PoolSnapshot> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value);
    } catch (error) {
      console.error('Error fetching multiple pools data:', error);
      throw error;
    }
  }
}

export const poolDataService = new PoolDataService();