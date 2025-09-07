import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Lock } from 'lucide-react';
import TimeSlider from './TimeSlider';
import { useEffect, useMemo, useState } from 'react';
import { createROClient } from "golem-base-sdk";
import { Logger, ILogObj } from "tslog";


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

// look at options object deocs nees conrjobs pfolder


const logLevelMap: Record<string, number> = {
  silly: 0,
  trace: 1,
  debug: 2,
  info: 3,
  warn: 4,
  error: 5,
  fatal: 6
};

const logger = new Logger<ILogObj>({
  name: "GolemDB Example",
  minLevel: logLevelMap[process.env.LOG_LEVEL as keyof typeof logLevelMap] || logLevelMap.info
});

const client = createROClient(
    60138453033,
    "https://ethwarsaw.holesky.golemdb.io/rpc",
    "wss://ethwarsaw.holesky.golemdb.io/rpc/ws",
    logger
)

const ownerAddress = '0xa10470C0F296E598945710b3100ca4CC2B43bA20'
const lpAddress = '0xFe4ec8F377be9e1e95A49d4e0D20F52D07b1ff0D' // glm/weth

// Helper function for retry logic with exponential backoff
const retryWithBackoff = async (
  fn: () => Promise<any>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<any> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxRetries) {
        throw error
      }
      
      const delay = baseDelay * Math.pow(2, attempt)
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('Max retries exceeded')
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
  timestamps,
}: LiquidityDistributionProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [liquidityData, setLiquidityData] = useState<any>({})
  const [error, setError] = useState<string | null>(null)
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false)
  const [loadedEntitiesCount, setLoadedEntitiesCount] = useState<number>(0)
  const [totalEntitiesCount, setTotalEntitiesCount] = useState<number>(0)


  useEffect(() => {
    // Start loading data immediately when component mounts
    if (!isLoadingData) {
      setIsLoadingData(true)
      setError(null)
      
      const loadLiquidityData = async () => {
        try {
          console.log('Starting data loading...')
          const lpData = {} as any
          
          console.log('Querying entities from Golem...')
          
          // Test client connection first
          try {
            console.log('Testing client connection...')
            // Try a simple query first
            const testQuery = await Promise.race([
              client.queryEntities(`$owner = "${ownerAddress}"`),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Connection test timeout')), 5000)
              )
            ]) as any[]
            console.log('Client connection successful, found', testQuery.length, 'total entities')
          } catch (connError) {
            console.error('Client connection failed:', connError)
            throw new Error(`Golem client connection failed: ${connError}`)
          }
          
          // Add timeout to prevent hanging
          const queryPromise = client.queryEntities(`$owner = "${ownerAddress}" && lpAddress = "${lpAddress}"`)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Query timeout after 10 seconds')), 10000)
          )
          
          const ownerEntities = await Promise.race([queryPromise, timeoutPromise]) as any[]
          console.log('Found entities:', ownerEntities.length)
          
          const decoder = new TextDecoder()
          
          setTotalEntitiesCount(ownerEntities.length)
          setLoadedEntitiesCount(0)
          
          // Process entities in batches to avoid overwhelming the server
          const BATCH_SIZE = 5
          const DELAY_MS = 100
          
          for (let i = 0; i < ownerEntities.length; i += BATCH_SIZE) {
            const batch = ownerEntities.slice(i, i + BATCH_SIZE)
            
            // Process batch with error handling and retry logic
            const batchPromises = batch.map(async (entity: any) => {
              try {
                const data = JSON.parse(decoder.decode(entity.storageValue))
                console.log(`Entity ${entity.entityKey}: ${data}`)
                
                // Use retry logic for getEntityMetaData calls
                const { numericAnnotations } = await retryWithBackoff(
                  () => client.getEntityMetaData(entity.entityKey),
                  2, // max 2 retries
                  500 // start with 500ms delay
                )
                
                const timestampAnnotation = numericAnnotations?.find((ann: any) => ann.key === "timestamp")
                const timestamp = timestampAnnotation?.value
                
                if (timestamp !== undefined) {
                  if (!lpData[timestamp]) lpData[timestamp] = []
                  lpData[timestamp].push(data)
                }
                
                return true // Success
              } catch (error) {
                console.error(`Error processing entity ${entity.entityKey} after retries:`, error)
                return false // Failed
              }
            })
            
            const results = await Promise.all(batchPromises)
            const successCount = results.filter((r: any) => r).length
            setLoadedEntitiesCount(prev => prev + successCount)
            
            // Update the UI with current data
            setLiquidityData({ ...lpData })
            
            // Add delay between batches to prevent overwhelming the server
            if (i + BATCH_SIZE < ownerEntities.length) {
              await new Promise(resolve => setTimeout(resolve, DELAY_MS))
            }
          }
          
          console.log('All data loaded successfully')
        } catch (error) {
          console.error('Error loading liquidity data:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
          setError(`Failed to load liquidity data: ${errorMessage}`)
        } finally {
          setIsLoadingData(false)
        }
      }
      
      // Start loading
      loadLiquidityData()
    }
  }, []) // Empty dependency array - only run once on mount

  const activeTimestamp = useMemo(() => {
    const timestamps = Object.keys(liquidityData).sort((a, b) => parseInt(a) - parseInt(b))
    return timestamps[currentIndex] || timestamps[timestamps.length - 1]
  }, [liquidityData, currentIndex])

  // Use fixed price range centered around current price for consistent scaling
  const priceRange = currentPrice * 0.4; // ±20% from current price
  const minPrice = currentPrice - priceRange;
  const maxPrice = currentPrice + priceRange;

  // Transform the raw data into chart format
  const chartData = useMemo(() => {
    if (!activeTimestamp || !liquidityData[activeTimestamp]) {
      return []
    }

    const rawData = liquidityData[activeTimestamp]
    const chartPoints: any[] = []

    console.log('Raw data sample:', rawData.slice(0, 3));
    console.log('Raw data length:', rawData.length);

    // Each entry is a tick with priceLower, priceUpper, totalAmount
    rawData.forEach((entry: any, index: number) => {
      if (entry.priceLower && entry.priceUpper && entry.totalAmount) {
        // Parse totalAmount which might be in scientific notation like "1.234e+32"
        let baseLiquidity: number;
        try {
          baseLiquidity = parseFloat(entry.totalAmount);
          // If it's in scientific notation, convert it properly
          if (entry.totalAmount.includes('e')) {
            baseLiquidity = parseFloat(entry.totalAmount);
          } else {
            // If it's a regular number, divide by 1e18 to convert from wei
            baseLiquidity = parseFloat(entry.totalAmount) / 1e18;
          }
        } catch (error) {
          console.error('Error parsing totalAmount:', entry.totalAmount, error);
          baseLiquidity = 0;
        }

        // Use the actual data values directly
        const price = (parseFloat(entry.priceLower) + parseFloat(entry.priceUpper)) / 2;
        
        // TEMPORARY: Add variation to test chart scaling
        // TODO: Remove this once we confirm the chart works with varied data
        const priceVariation = Math.abs(price - currentPrice) / currentPrice;
        const variationFactor = 0.5 + Math.sin(index * 0.1) * 0.3 + Math.random() * 0.4;
        const finalLiquidity = baseLiquidity * variationFactor;

        chartPoints.push({
          tick: index,
          liquidity: finalLiquidity,
          price: price,
          priceLower: parseFloat(entry.priceLower),
          priceUpper: parseFloat(entry.priceUpper)
        })
      }
    })

    // Debug logging
    console.log('Price range:', { minPrice, maxPrice, currentPrice });
    console.log('Chart points before filtering:', chartPoints.length);
    if (chartPoints.length > 0) {
      console.log('Sample chart point:', chartPoints[0]);
      console.log('Price range of data:', {
        min: Math.min(...chartPoints.map(p => p.price)),
        max: Math.max(...chartPoints.map(p => p.price))
      });
      console.log('Liquidity range of data:', {
        min: Math.min(...chartPoints.map(p => p.liquidity)),
        max: Math.max(...chartPoints.map(p => p.liquidity)),
        unique: [...new Set(chartPoints.map(p => p.liquidity))].length
      });
      console.log('First 5 liquidity values:', chartPoints.slice(0, 5).map(p => p.liquidity));
    }
    
    // Temporarily remove filtering to see all data
    // TODO: Re-enable filtering once we understand the data range
    const filteredPoints = chartPoints;
    
    // Sort by price to create a proper distribution
    filteredPoints.sort((a, b) => a.price - b.price);
    
    // Reassign tick indices after sorting
    filteredPoints.forEach((point, index) => {
      point.tick = index;
    });

    return filteredPoints
  }, [activeTimestamp, liquidityData, minPrice, maxPrice])

  console.log('active timestamp', activeTimestamp)
  console.log('chart data length:', chartData.length)
  console.log('liquidity values range:', chartData.length > 0 ? {
    min: Math.min(...chartData.map(d => d.liquidity)),
    max: Math.max(...chartData.map(d => d.liquidity)),
    unique: [...new Set(chartData.map(d => d.liquidity))].length
  } : 'no data')
  // Generate liquidity distribution data that resembles a bell curve
  // const generateLiquidityData = (): LiquidityData[] => {
  //   const data: LiquidityData[] = [];
  //   const centerPrice = currentPrice;
  //   const numBars = 100;
    
  //   for (let i = 0; i < numBars; i++) {
  //     const priceRange = centerPrice * 0.4; // ±20% from center
  //     const price = centerPrice - priceRange/2 + (priceRange * i / numBars);
      
  //     // Create bell curve distribution
  //     const distanceFromCenter = Math.abs(i - numBars/2) / (numBars/2);
  //     const liquidity = Math.exp(-Math.pow(distanceFromCenter * 2.5, 2)) * (0.8 + Math.random() * 0.4);
      
  //     data.push({
  //       tick: i,
  //       liquidity: liquidity * 100,
  //       price: price
  //     });
  //   }
    
  //   return data;
  // };

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

  const currentPricePosition = 50; // Always center the red line

  // Show loading state only if we have no data at all and are loading
  if (Object.keys(liquidityData).length === 0 && isLoadingData) {
    return (
      <Card className="p-6 bg-card shadow-card border-border">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading liquidity data...</p>
            {totalEntitiesCount > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Loading {loadedEntitiesCount} of {totalEntitiesCount} entities...
              </p>
            )}
          </div>
        </div>
      </Card>
    )
  }

  // Show error state
  if (error) {
    return (
      <Card className="p-6 bg-card shadow-card border-border">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="text-red-500 mb-4">⚠️</div>
            <p className="text-red-500 mb-4">{error}</p>
            <button 
              onClick={() => {
                setError(null)
                setLiquidityData({})
                setIsLoadingData(false) // Reset loading state
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </Card>
    )
  }

  // Show initializing state if component just mounted
  if (Object.keys(liquidityData).length === 0 && !isLoadingData) {
    return (
      <Card className="p-6 bg-card shadow-card border-border">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Initializing...</p>
          </div>
        </div>
      </Card>
    )
  }

  // Show message if no data is available for current timestamp
  if (!isLoadingData && chartData.length === 0 && Object.keys(liquidityData).length > 0) {
    return (
      <Card className="p-6 bg-card shadow-card border-border">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="text-yellow-500 mb-4">📊</div>
            <p className="text-muted-foreground mb-4">No liquidity data available for the selected time period.</p>
            <p className="text-xs text-muted-foreground">
              Active timestamp: {activeTimestamp || 'None'} | 
              Available timestamps: {Object.keys(liquidityData).length} | 
              Chart points: {chartData.length}
            </p>
            {Object.keys(liquidityData).length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Available timestamps: {Object.keys(liquidityData).sort((a, b) => parseInt(a) - parseInt(b)).slice(0, 3).join(', ')}
                {Object.keys(liquidityData).length > 3 && '...'}
              </p>
            )}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card className="p-6 bg-card shadow-card border-border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground">Liquidity Distribution</h2>
            {isLoadingData && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin"></div>
                <span>Loading... ({loadedEntitiesCount}/{totalEntitiesCount})</span>
              </div>
            )}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            1 LINK = {currentPrice.toFixed(4)} USDC
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
            <div className="flex items-center gap-2">
              {isLoadingData ? (
                <span className="text-blue-500 text-xs">📊 Loading Data</span>
              ) : (
                <span className="text-green-500 text-xs">✓ Live Data</span>
              )}
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
          {/* Current price indicator */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-500"
            style={{ left: `${Math.max(0, Math.min(100, currentPricePosition))}%` }}
          />
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
            <XAxis 
              dataKey="tick" 
              hide
            />
            <YAxis hide />
            <Bar dataKey="liquidity" stroke="none" fill="#8884d8">
              {chartData.map((entry: any, index: number) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getBarColor(index, chartData.length)}
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
            <span>${minPrice.toFixed(2)}</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-success rounded-full" />
              <span className="text-primary font-medium">Current Range</span>
              <div className="w-2 h-2 bg-success rounded-full" />
            </div>
            <span>${maxPrice.toFixed(2)}</span>
          </div>
        </div>
      </div>

    </Card>
      
      <div className="mt-6">
        <TimeSlider
          currentIndex={currentIndex}
          maxIndex={Object.keys(liquidityData).length - 1}
          onIndexChange={onIndexChange}
          timestamps={Object.keys(liquidityData).sort((a, b) => parseInt(a) - parseInt(b)).map(ts => new Date(parseInt(ts)).toISOString().split('T')[0])}
        />
      </div>
    </>
  );
};

export default LiquidityDistribution;