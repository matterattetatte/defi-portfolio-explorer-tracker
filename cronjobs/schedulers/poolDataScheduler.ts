import * as cron from 'node-cron';
import { poolDataService, PoolConfig } from '../services/poolDataService.js';
import { golemService } from '../services/golemService.js';

export class PoolDataScheduler {
  private isRunning = false;
  private scheduledTask: cron.ScheduledTask | null = null;
  
  // Default pool configurations - can be moved to config file or database
  private readonly defaultPools: PoolConfig[] = [
    {
      chain: 'base',
      exchange: 'uniswap',
      network: 'base',
      poolAddress: '0xd0b53D9277642d899DF5C87A3966A349A798F224',
      feeTier: '100'
    },
    // Add more pools here as needed
    // {
    //   chain: 'ethereum',
    //   exchange: 'uniswap', 
    //   network: 'ethereum',
    //   poolAddress: '0x531b6a4b3f962208ea8ed5268c642c84bb29be0b',
    //   feeTier: '100'
    // }
  ];

  async initialize(): Promise<void> {
    // Initialize Golem service
    await golemService.initialize();
    console.log('Pool data scheduler initialized');
  }

  async fetchAndStorePoolData(pools: PoolConfig[] = this.defaultPools): Promise<void> {
    if (this.isRunning) {
      console.log('Pool data collection already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log(`Starting pool data collection for ${pools.length} pools...`);
      
      const snapshots = await poolDataService.fetchMultiplePoolsData(pools);
      console.log(`Successfully fetched data for ${snapshots.length} pools`);

      // Store each snapshot
      const storePromises = snapshots.map(async (snapshot) => {
        try {
          await golemService.storePoolSnapshot(snapshot);
          console.log(`Stored snapshot for pool ${snapshot.poolAddress}`);
        } catch (error) {
          console.error(`Failed to store snapshot for pool ${snapshot.poolAddress}:`, error);
        }
      });

      await Promise.allSettled(storePromises);
      
      const duration = Date.now() - startTime;
      console.log(`Pool data collection completed in ${duration}ms`);
      
    } catch (error) {
      console.error('Error during pool data collection:', error);
    } finally {
      this.isRunning = false;
    }
  }

  startScheduler(cronExpression: string = '0 * * * *'): void { // Default: every hour
    if (this.scheduledTask) {
      console.log('Scheduler already running');
      return;
    }

    console.log(`Starting pool data scheduler with cron expression: ${cronExpression}`);
    
    this.scheduledTask = cron.schedule(cronExpression, async () => {
      console.log(`[${new Date().toISOString()}] Running scheduled pool data collection`);
      await this.fetchAndStorePoolData();
    }, {
      scheduled: false // Don't start immediately
    });

    this.scheduledTask.start();
    console.log('Pool data scheduler started');
  }

  stopScheduler(): void {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask = null;
      console.log('Pool data scheduler stopped');
    }
  }

  getStatus(): { isRunning: boolean; isScheduled: boolean; pools: number } {
    return {
      isRunning: this.isRunning,
      isScheduled: this.scheduledTask !== null,
      pools: this.defaultPools.length
    };
  }

  // Method to add more pools dynamically
  addPool(poolConfig: PoolConfig): void {
    this.defaultPools.push(poolConfig);
    console.log(`Added pool ${poolConfig.poolAddress} to monitoring`);
  }

  // Method to remove pools
  removePool(poolAddress: string): void {
    const index = this.defaultPools.findIndex(pool => pool.poolAddress === poolAddress);
    if (index > -1) {
      this.defaultPools.splice(index, 1);
      console.log(`Removed pool ${poolAddress} from monitoring`);
    }
  }

  // Method for manual data collection (useful for testing)
  async collectDataNow(): Promise<void> {
    console.log('Manual pool data collection triggered');
    await this.fetchAndStorePoolData();
  }
}

export const poolDataScheduler = new PoolDataScheduler();