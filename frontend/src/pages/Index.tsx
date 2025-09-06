import { useState } from 'react';
import PriceChart from '@/components/PriceChart';
import LPAnalytics from '@/components/LPAnalytics';
import TimeSlider from '@/components/TimeSlider';
import LiquidityDistribution from '@/components/LiquidityDistribution';
import { useMockData } from '@/hooks/useMockData';

const Index = () => {
  const { priceData, lpData } = useMockData();
  const [currentIndex, setCurrentIndex] = useState(priceData.length - 1);
  const [zoomLevel, setZoomLevel] = useState(1);

  if (priceData.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const currentLpData = lpData[currentIndex] || lpData[lpData.length - 1];
  const currentPrice = priceData[currentIndex]?.price || 14.50;

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.5, 5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.5, 0.5));

  return (
    <div className="min-h-screen bg-gradient-bg">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                DeFi Analytics
              </h1>
              <p className="text-muted-foreground">
                Advanced liquidity pool analytics and historical insights
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Base Network</p>
              <p className="text-primary font-medium">Uniswap V3</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Liquidity Distribution */}
        <LiquidityDistribution
          currentPrice={currentPrice}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          currentDate={priceData[currentIndex]?.timestamp || ''}
          currentApr={currentLpData.apr}
          currentIndex={currentIndex}
          maxIndex={priceData.length - 1}
          onIndexChange={setCurrentIndex}
          timestamps={priceData.map(d => d.timestamp)}
        />

        {/* Price Chart */}
        <PriceChart data={priceData} currentIndex={currentIndex} />

        {/* LP Analytics */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Liquidity Pool Metrics
          </h2>
          <LPAnalytics data={currentLpData} />
        </div>
      </main>
    </div>
  );
};

export default Index;
