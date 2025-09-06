import express from 'express';
import cors from 'cors';
import { golemService, QueryOptions } from '../services/golemService.js';
import { poolDataScheduler } from '../schedulers/poolDataScheduler.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'DeFi Pool Data API'
  });
});

// Get scheduler status
app.get('/api/scheduler/status', (req, res) => {
  const status = poolDataScheduler.getStatus();
  res.json(status);
});

// Trigger manual data collection
app.post('/api/scheduler/collect', async (req, res) => {
  try {
    await poolDataScheduler.collectDataNow();
    res.json({ message: 'Data collection triggered successfully' });
  } catch (error) {
    console.error('Error triggering data collection:', error);
    res.status(500).json({ error: 'Failed to trigger data collection' });
  }
});

// Get latest pool data
app.get('/api/pools/:poolAddress/latest', async (req, res) => {
  try {
    const { poolAddress } = req.params;
    const data = await golemService.getLatestPoolData(poolAddress);
    
    res.json({
      poolAddress,
      timestamp: data.length > 0 ? data[0].timestamp : null,
      liquidityData: data,
      count: data.length
    });
  } catch (error) {
    console.error('Error fetching latest pool data:', error);
    res.status(500).json({ error: 'Failed to fetch pool data' });
  }
});

// Get latest pool data formatted for bar chart
app.get('/api/pools/:poolAddress/bar-chart', async (req, res) => {
  try {
    const { poolAddress } = req.params;
    const data = await golemService.getLatestPoolData(poolAddress);
    
    // Format data for bar chart (price ranges vs liquidity)
    const barChartData = data.map(item => ({
      tickIdx: item.tickIdx,
      priceLower: item.priceLower,
      priceUpper: item.priceUpper,
      totalAmount: item.totalAmount,
    })).sort((a, b) => a.tickIdx - b.tickIdx);
    
    res.json({
      poolAddress,
      timestamp: data.length > 0 ? data[0].timestamp : null,
      barChartData,
      count: barChartData.length
    });
  } catch (error) {
    console.error('Error fetching bar chart data:', error);
    res.status(500).json({ error: 'Failed to fetch bar chart data' });
  }
});

// Get historical pool data with time range
app.get('/api/pools/:poolAddress/history', async (req, res) => {
  try {
    const { poolAddress } = req.params;
    const { startTime, endTime, limit } = req.query;

    const options: QueryOptions = { poolAddress };
    
    if (startTime) {
      options.startTime = new Date(startTime as string);
    }
    
    if (endTime) {
      options.endTime = new Date(endTime as string);
    }
    
    if (limit) {
      options.limit = parseInt(limit as string);
    }

    const data = await golemService.queryPoolData(options);
    
    res.json({
      poolAddress,
      timeRange: {
        startTime: options.startTime?.toISOString(),
        endTime: options.endTime?.toISOString()
      },
      liquidityData: data,
      count: data.length
    });
  } catch (error) {
    console.error('Error fetching pool history:', error);
    res.status(500).json({ error: 'Failed to fetch pool history' });
  }
});

// Get pool data grouped by time intervals (for slider functionality)
app.get('/api/pools/:poolAddress/timeseries', async (req, res) => {
  try {
    const { poolAddress } = req.params;
    const { startTime, endTime } = req.query;

    if (!startTime || !endTime) {
      return res.status(400).json({ 
        error: 'startTime and endTime query parameters are required' 
      });
    }

    const start = new Date(startTime as string);
    const end = new Date(endTime as string);
    
    const timeSeriesData = await golemService.getPoolDataForTimeRange(poolAddress, start, end);
    
    // Transform into format suitable for frontend slider
    const timeSlots = Object.keys(timeSeriesData)
      .sort()
      .map(timestamp => ({
        timestamp,
        liquidityData: timeSeriesData[timestamp],
        barChartData: timeSeriesData[timestamp].map(item => ({
          tickIdx: item.tickIdx,
          priceLower: item.priceLower,
          priceUpper: item.priceUpper,
          totalAmount: item.totalAmount,
        })).sort((a, b) => a.tickIdx - b.tickIdx),
        tickCount: timeSeriesData[timestamp].length
      }));

    res.json({
      poolAddress,
      timeRange: {
        startTime: start.toISOString(),
        endTime: end.toISOString()
      },
      timeSlots,
      totalSlots: timeSlots.length
    });
  } catch (error) {
    console.error('Error fetching time series data:', error);
    res.status(500).json({ error: 'Failed to fetch time series data' });
  }
});

// Get aggregated pool statistics
app.get('/api/pools/:poolAddress/stats', async (req, res) => {
  try {
    const { poolAddress } = req.params;
    const { hours = '24' } = req.query;
    
    const hoursBack = parseInt(hours as string);
    const startTime = new Date(Date.now() - (hoursBack * 60 * 60 * 1000));
    
    const data = await golemService.queryPoolData({
      poolAddress,
      startTime,
      limit: 10000
    });

    if (data.length === 0) {
      return res.json({
        poolAddress,
        stats: null,
        message: 'No data available for the specified time range'
      });
    }

    // Calculate basic statistics
    const totalLiquidity0 = data.reduce((sum, item) => sum + item.token0Amount, 0);
    const totalLiquidity1 = data.reduce((sum, item) => sum + item.token1Amount, 0);
    const avgLiquidity0 = totalLiquidity0 / data.length;
    const avgLiquidity1 = totalLiquidity1 / data.length;
    
    const tickRange = {
      min: Math.min(...data.map(d => d.tickIdx)),
      max: Math.max(...data.map(d => d.tickIdx))
    };

    const uniqueTimestamps = [...new Set(data.map(d => d.timestamp.toISOString()))];

    res.json({
      poolAddress,
      timeRange: `${hoursBack} hours`,
      stats: {
        totalDataPoints: data.length,
        snapshots: uniqueTimestamps.length,
        avgLiquidity: {
          token0: avgLiquidity0,
          token1: avgLiquidity1
        },
        tickRange,
        latestSnapshot: data[0]?.timestamp,
        oldestSnapshot: data[data.length - 1]?.timestamp
      }
    });
  } catch (error) {
    console.error('Error calculating pool stats:', error);
    res.status(500).json({ error: 'Failed to calculate pool statistics' });
  }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

export async function startServer(): Promise<void> {
  try {
    // Initialize services
    await golemService.initialize();
    console.log('Golem service initialized');
    
    await poolDataScheduler.initialize();
    console.log('Pool data scheduler initialized');

    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 DeFi Pool Data API server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📈 Pool API: http://localhost:${PORT}/api/pools/{poolAddress}/latest`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

export { app };