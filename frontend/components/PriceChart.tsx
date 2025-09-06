import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';

interface PriceData {
  timestamp: string;
  price: number;
  volume: number;
}

interface PriceChartProps {
  data: PriceData[];
  currentIndex: number;
}

const PriceChart = ({ data, currentIndex }: PriceChartProps) => {
  // Safety checks
  if (!data || data.length === 0 || currentIndex < 0) {
    return (
      <Card className="p-6 bg-card shadow-card border-border">
        <div className="flex items-center justify-center h-80">
          <p className="text-muted-foreground">No chart data available</p>
        </div>
      </Card>
    );
  }

  const safeCurrentIndex = Math.min(currentIndex, data.length - 1);
  const displayData = data.slice(0, safeCurrentIndex + 1);
  const currentPrice = data[safeCurrentIndex]?.price || 0;
  const previousPrice = data[safeCurrentIndex - 1]?.price || currentPrice;
  const priceChange = previousPrice !== 0 ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0;

  return (
    <Card className="p-6 bg-card shadow-card border-border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">LINK/USDC</h2>
          <p className="text-muted-foreground">Uniswap V3 • Base</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-foreground">
            ${typeof currentPrice === 'number' && !isNaN(currentPrice) ? currentPrice.toFixed(4) : '0.0000'}
          </div>
          <div className={`text-sm ${priceChange >= 0 ? 'text-success' : 'text-destructive'}`}>
            {priceChange >= 0 ? '+' : ''}{typeof priceChange === 'number' && !isNaN(priceChange) ? priceChange.toFixed(2) : '0.00'}%
          </div>
        </div>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={displayData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="timestamp" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              domain={['dataMin - 0.1', 'dataMax + 0.1']}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))'
              }}
              formatter={(value: number) => [`$${value.toFixed(4)}`, 'Price']}
            />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={false}
              activeDot={{ 
                r: 6, 
                fill: 'hsl(var(--primary))',
                filter: 'drop-shadow(var(--glow-primary))'
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default PriceChart;