import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Lock } from 'lucide-react';
import TimeSlider from './TimeSlider';

interface LiquidityData {
  tick: number;
  liquidity: number;
  price: number;
}

interface LiquidityDistributionProps {
  currentPrice: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  currentDate: string;
  currentApr: number;
  currentIndex: number;
  maxIndex: number;
  onIndexChange: (index: number) => void;
  timestamps: string[];
}

const LiquidityDistribution = ({ 
  currentPrice, 
  onZoomIn, 
  onZoomOut, 
  currentDate, 
  currentApr,
  currentIndex,
  maxIndex,
  onIndexChange,
  timestamps
}: LiquidityDistributionProps) => {
  // Generate liquidity distribution data that resembles a bell curve
  const generateLiquidityData = (): LiquidityData[] => {
    const data: LiquidityData[] = [];
    const centerPrice = currentPrice;
    const numBars = 100;
    
    for (let i = 0; i < numBars; i++) {
      const priceRange = centerPrice * 0.4; // ±20% from center
      const price = centerPrice - priceRange/2 + (priceRange * i / numBars);
      
      // Create bell curve distribution
      const distanceFromCenter = Math.abs(i - numBars/2) / (numBars/2);
      const liquidity = Math.exp(-Math.pow(distanceFromCenter * 2.5, 2)) * (0.8 + Math.random() * 0.4);
      
      data.push({
        tick: i,
        liquidity: liquidity * 100,
        price: price
      });
    }
    
    return data;
  };

  const liquidityData = generateLiquidityData();

  // Generate gradient colors for each bar (purple to blue to cyan)
  const getBarColor = (index: number, total: number) => {
    const position = index / total;
    
    if (position < 0.33) {
      // Purple to Blue
      const r = Math.round(138 - (138 - 59) * (position / 0.33));
      const g = Math.round(43 + (130 - 43) * (position / 0.33));
      const b = Math.round(226 + (255 - 226) * (position / 0.33));
      return `rgb(${r}, ${g}, ${b})`;
    } else if (position < 0.67) {
      // Blue to Cyan
      const localPos = (position - 0.33) / 0.34;
      const r = Math.round(59 - (59 - 34) * localPos);
      const g = Math.round(130 + (211 - 130) * localPos);
      const b = Math.round(255);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Cyan to Light Blue
      const localPos = (position - 0.67) / 0.33;
      const r = Math.round(34 + (100 - 34) * localPos);
      const g = Math.round(211 + (200 - 211) * localPos);
      const b = Math.round(255);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  // Find the current price position for range markers
  const currentPriceIndex = Math.round(liquidityData.length / 2);
  const rangeWidth = 20; // Width of the "in range" area
  const rangeStart = currentPriceIndex - rangeWidth / 2;
  const rangeEnd = currentPriceIndex + rangeWidth / 2;

  // Calculate current price line position
  const centerPrice = liquidityData[currentPriceIndex]?.price || currentPrice;
  const priceRange = centerPrice * 0.4; // ±20% from center
  const minPrice = centerPrice - priceRange/2;
  const maxPrice = centerPrice + priceRange/2;
  const currentPricePosition = ((currentPrice - minPrice) / (maxPrice - minPrice)) * 100;

  return (
    <>
      <Card className="p-6 bg-card shadow-card border-border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Liquidity Distribution</h2>
          <div className="text-sm text-muted-foreground mt-1">
            1 GLM = {currentPrice.toFixed(4)} WETH
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Date: {new Date(currentDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>APR: {currentApr.toFixed(2)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Ticks in Range:</span>
              <Lock className="h-3 w-3" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onZoomOut}
            className="h-8 w-8 p-0 border-border hover:bg-secondary"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onZoomIn}
            className="h-8 w-8 p-0 border-border hover:bg-secondary"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative h-80">
        {/* Range indicators */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-success"
            style={{ left: `${(rangeStart / liquidityData.length) * 100}%` }}
          />
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-success"
            style={{ left: `${(rangeEnd / liquidityData.length) * 100}%` }}
          />
          {/* Current price indicator */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-500"
            style={{ left: `${Math.max(0, Math.min(100, currentPricePosition))}%` }}
          />
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={liquidityData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
            <XAxis 
              dataKey="tick" 
              hide
            />
            <YAxis hide />
            <Bar dataKey="liquidity" stroke="none">
              {liquidityData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getBarColor(index, liquidityData.length)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Price range indicator */}
      <div className="flex justify-center mt-4">
        <div className="text-xs text-muted-foreground text-center">
          <div className="flex items-center gap-4">
            <span>${(currentPrice * 0.8).toFixed(2)}</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-success rounded-full" />
              <span className="text-primary font-medium">Current Range</span>
              <div className="w-2 h-2 bg-success rounded-full" />
            </div>
            <span>${(currentPrice * 1.2).toFixed(2)}</span>
          </div>
        </div>
      </div>

    </Card>
      
      <div className="mt-6">
        <TimeSlider
          currentIndex={currentIndex}
          maxIndex={maxIndex}
          onIndexChange={onIndexChange}
          timestamps={timestamps}
        />
      </div>
    </>
  );
};

export default LiquidityDistribution;