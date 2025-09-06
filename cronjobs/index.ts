import * as dotenv from "dotenv";
import { startServer } from './api/server.js';
import { poolDataScheduler } from './schedulers/poolDataScheduler.js';

// Load environment variables
dotenv.config();

async function main() {
  try {
    console.log('🚀 Starting DeFi Pool Data Tracker...');
    
    // Start the API server
    console.log('📡 Initializing API server...');
    await startServer();
    
    // Start the scheduler for automatic data collection
    const cronExpression = process.env.CRON_SCHEDULE || '0 * * * *'; // Default: every hour
    console.log(`⏰ Starting data collection scheduler (${cronExpression})...`);
    
    await poolDataScheduler.initialize();
    poolDataScheduler.startScheduler(cronExpression);
    
    console.log('✅ All services started successfully!');
    console.log(`
🎯 Available endpoints:
   - Health check: http://localhost:3001/health
   - Scheduler status: http://localhost:3001/api/scheduler/status
   - Latest pool data: http://localhost:3001/api/pools/{poolAddress}/latest
   - Bar chart data: http://localhost:3001/api/pools/{poolAddress}/bar-chart
   - Pool history: http://localhost:3001/api/pools/{poolAddress}/history
   - Time series: http://localhost:3001/api/pools/{poolAddress}/timeseries
   - Pool stats: http://localhost:3001/api/pools/{poolAddress}/stats
   
📊 Example pool address: 0xd0b53D9277642d899DF5C87A3966A349A798F224
    `);

    // Optional: trigger initial data collection
    if (process.env.COLLECT_ON_START === 'true') {
      console.log('🔄 Triggering initial data collection...');
      await poolDataScheduler.collectDataNow();
    }

  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  poolDataScheduler.stopScheduler();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  poolDataScheduler.stopScheduler();
  process.exit(0);
});

main().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});