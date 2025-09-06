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
  const displayData = data.slice(0, currentIndex + 1);
  const currentPrice = data[currentIndex]?.price || 0;
  const previousPrice = data[currentIndex - 1]?.price || currentPrice;
  const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;

  return (
    <Card className="p-6 bg-card shadow-card border-border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">LINK/USDC</h2>
          <p className="text-muted-foreground">Uniswap V3 • Base</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-foreground">
            ${currentPrice.toFixed(4)}
          </div>
          <div className={`text-sm ${priceChange >= 0 ? 'text-success' : 'text-destructive'}`}>
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
          </div>
        </div>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displayData}>
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