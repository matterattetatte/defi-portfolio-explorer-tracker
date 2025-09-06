import { useState, useEffect } from 'react';

export interface PriceData {
  timestamp: string;
  price: number;
  volume: number;
}

export interface LPData {
  tvl: number;
  volume24h: number;
  fees24h: number;
  apr: number;
  poolShare: number;
  impermanentLoss: number;
}

export const useMockData = () => {
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [lpData, setLpData] = useState<LPData[]>([]);

  useEffect(() => {
    // Generate mock historical data for the last 30 days
    const generateData = () => {
      const data: PriceData[] = [];
      const lpDataArray: LPData[] = [];
      const basePrice = 14.50; // LINK base price
      const now = new Date();

      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        
        // Simulate price movement with some volatility
        const randomFactor = 0.95 + Math.random() * 0.1; // ±5% daily variation
        const trendFactor = 1 + (Math.sin(i * 0.2) * 0.02); // Long-term trend
        const price = basePrice * randomFactor * trendFactor;
        
        const volume = 500000 + Math.random() * 1000000; // Random volume
        
        data.push({
          timestamp: date.toISOString().split('T')[0],
          price: parseFloat(price.toFixed(4)),
          volume: Math.floor(volume)
        });

        // Generate corresponding LP data
        const tvl = 2500000 + Math.random() * 500000;
        const volume24h = volume;
        const fees24h = volume24h * 0.003; // 0.3% fee
        const apr = 5 + Math.random() * 20; // 5-25% APR
        const poolShare = 0.1 + Math.random() * 2; // 0.1-2.1% pool share
        const impermanentLoss = -Math.random() * 15; // 0 to -15% IL

        lpDataArray.push({
          tvl,
          volume24h,
          fees24h,
          apr,
          poolShare,
          impermanentLoss
        });
      }

      setPriceData(data);
      setLpData(lpDataArray);
    };

    generateData();
  }, []);

  return { priceData, lpData };
};