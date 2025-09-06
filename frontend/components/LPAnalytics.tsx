import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react';

interface LPData {
  tvl: number;
  volume24h: number;
  fees24h: number;
  apr: number;
  poolShare: number;
  impermanentLoss: number;
}

interface LPAnalyticsProps {
  data: LPData;
}

const LPAnalytics = ({ data }: LPAnalyticsProps) => {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatPercentage = (value: number) => `${value.toFixed(2)}%`;

  const metrics = [
    {
      label: 'Total Value Locked',
      value: formatCurrency(data.tvl),
      icon: DollarSign,
      trend: 'neutral' as const
    },
    {
      label: '24h Volume',
      value: formatCurrency(data.volume24h),
      icon: BarChart3,
      trend: 'up' as const
    },
    {
      label: '24h Fees',
      value: formatCurrency(data.fees24h),
      icon: TrendingUp,
      trend: 'up' as const
    },
    {
      label: 'Current APR',
      value: formatPercentage(data.apr),
      icon: TrendingUp,
      trend: data.apr > 10 ? 'up' : 'neutral' as const
    },
    {
      label: 'Pool Share',
      value: formatPercentage(data.poolShare),
      icon: BarChart3,
      trend: 'neutral' as const
    },
    {
      label: 'Impermanent Loss',
      value: formatPercentage(data.impermanentLoss),
      icon: TrendingDown,
      trend: data.impermanentLoss < -5 ? 'down' : 'neutral' as const
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card key={index} className="p-4 bg-card shadow-card border-border hover:shadow-glow-primary/20 transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{metric.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${
                metric.trend === 'up' ? 'bg-success/20 text-success' :
                metric.trend === 'down' ? 'bg-destructive/20 text-destructive' :
                'bg-primary/20 text-primary'
              }`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default LPAnalytics;