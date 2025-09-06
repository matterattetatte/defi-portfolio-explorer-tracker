# DeFi Pool Data Tracker

A backend service that tracks Uniswap V3 liquidity pool data and provides REST API endpoints for historical analysis with slider functionality.

## Features

- 📊 **Real-time data collection** from Uniswap V3 pools via Metrix Finance API
- 🗄️ **Historical data storage** using Golem DB
- ⏰ **Automated cron jobs** for periodic data collection 
- 🔗 **REST API** with multiple endpoints for frontend integration
- 📈 **Bar chart data format** for liquidity distribution visualization
- 🕐 **Time-series queries** optimized for slider functionality

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Required Environment Variables
- `PRIVATE_KEY`: Your Golem DB private key (required)
- `PORT`: API server port (default: 3001)
- `CRON_SCHEDULE`: Cron expression for data collection (default: every hour)
- `COLLECT_ON_START`: Trigger initial collection on startup (default: false)

### 4. Start the Service
```bash
npm run dev
```

## API Endpoints

### Core Endpoints
- `GET /health` - Service health check
- `GET /api/scheduler/status` - Scheduler status
- `POST /api/scheduler/collect` - Trigger manual data collection

### Pool Data Endpoints
- `GET /api/pools/{poolAddress}/latest` - Latest pool snapshot
- `GET /api/pools/{poolAddress}/bar-chart` - Bar chart formatted data
- `GET /api/pools/{poolAddress}/history` - Historical data with filters
- `GET /api/pools/{poolAddress}/timeseries` - Time-series data for sliders
- `GET /api/pools/{poolAddress}/stats` - Aggregated statistics

### Example Pool Address
`0xd0b53D9277642d899DF5C87A3966A349A798F224` (WETH/USDC on Base)

## Data Format

### Bar Chart Data Structure
```json
{
  "tickIdx": -193020,
  "priceLower": 4146.36,
  "priceUpper": 4150.51,
  "totalAmount": 2.0574974926481122e+284
}
```

### Time Series Response
```json
{
  "poolAddress": "0xd0b53...",
  "timeSlots": [
    {
      "timestamp": "2024-01-15T09:00:00.000Z",
      "barChartData": [...],
      "tickCount": 100
    }
  ]
}
```

## Architecture

```
cronjobs/
├── services/           # Core business logic
│   ├── poolDataService.ts    # Data fetching from Metrix Finance
│   └── golemService.ts       # Golem DB operations
├── schedulers/         # Cron job management
│   └── poolDataScheduler.ts
├── api/               # REST API endpoints
│   └── server.ts
└── index.ts          # Main application entry
```

## Scripts

- `npm run dev` - Start development server
- `npm run start` - Start production server  
- `npm run build` - Build TypeScript
- `npm run typecheck` - Type checking
- `npm run legacy` - Run original implementation

## Configuration

### Pool Configuration
Add pools to monitor in `schedulers/poolDataScheduler.ts`:

```typescript
const poolConfigs = [
  {
    chain: 'base',
    exchange: 'uniswap',
    network: 'base', 
    poolAddress: '0xd0b53D9277642d899DF5C87A3966A349A798F224',
    feeTier: '100'
  }
];
```

### Cron Schedule Examples
- `0 * * * *` - Every hour
- `*/15 * * * *` - Every 15 minutes
- `0 */6 * * *` - Every 6 hours

## Frontend Integration

Use the `/timeseries` endpoint for slider functionality:

```javascript
// Fetch historical data for slider
const response = await fetch(`/api/pools/${poolAddress}/timeseries?startTime=${start}&endTime=${end}`);
const { timeSlots } = await response.json();

// Each time slot contains barChartData ready for visualization
timeSlots.forEach(slot => {
  console.log(slot.timestamp, slot.barChartData);
});
```