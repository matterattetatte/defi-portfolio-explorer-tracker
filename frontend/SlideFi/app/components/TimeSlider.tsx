import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useState, useEffect } from 'react';

interface TimeSliderProps {
  currentIndex: number;
  maxIndex: number;
  onIndexChange: (index: number) => void;
  timestamps: string[];
}

const TimeSlider = ({ currentIndex, maxIndex, onIndexChange, timestamps }: TimeSliderProps) => {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      if (currentIndex >= maxIndex) {
        setIsPlaying(false);
        return;
      }
      onIndexChange(currentIndex + 1);
    }, 200);

    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, maxIndex, onIndexChange]);

  const handlePlay = () => {
    if (currentIndex >= maxIndex) {
      onIndexChange(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    onIndexChange(0);
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="p-6 bg-card shadow-card border-border">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Historical Timeline</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="border-border hover:bg-secondary"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePlay}
              className="border-border hover:bg-secondary"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Slider
            value={[currentIndex]}
            onValueChange={(value) => onIndexChange(value[0])}
            max={maxIndex}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{timestamps[0] ? formatDate(timestamps[0]) : 'Start'}</span>
            <span className="text-primary font-medium">
              {timestamps[currentIndex] ? formatDate(timestamps[currentIndex]) : 'Current'}
            </span>
            <span>{timestamps[maxIndex] ? formatDate(timestamps[maxIndex]) : 'End'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Frame {currentIndex + 1} of {maxIndex + 1}
          </span>
          <span className="text-muted-foreground">
            Speed: 5x
          </span>
        </div>
      </div>
    </Card>
  );
};

export default TimeSlider;