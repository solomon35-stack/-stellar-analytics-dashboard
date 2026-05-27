import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: number | undefined;
  changeLabel?: string;
  format?: 'number' | 'currency' | 'percentage';
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  change,
  changeLabel,
  format = 'number',
}: MetricCardProps) {
  const formatValue = (val: string | number) => {
    const numericValue = typeof val === 'string' ? parseFloat(val) : val;

    if (format === 'currency') {
      return numericValue.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    if (format === 'percentage') {
      return `${numericValue.toLocaleString()}%`;
    }

    return numericValue.toLocaleString();
  };

  const isPositive = typeof change === 'number' && change > 0;
  const isNegative = typeof change === 'number' && change < 0;

  const formattedValue = formatValue(value);

  // Build a descriptive label for screen readers
  const trendDescription = changeLabel
    ? isPositive
      ? `Trending up — ${changeLabel}`
      : isNegative
        ? `Trending down — ${changeLabel}`
        : changeLabel
    : undefined;

  return (
    <article
      className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-all group"
      aria-label={`${title}: ${formattedValue}${trendDescription ? `. ${trendDescription}` : ''}`}
    >
      <div className="flex items-center gap-4">
        <div
          className="rounded-lg bg-primary/10 p-2.5 group-hover:bg-primary/20 transition-colors"
          aria-hidden="true"
        >
          <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className="text-2xl font-bold text-foreground tabular-nums" aria-hidden="true">
            {formattedValue}
          </p>
        </div>
      </div>

      {changeLabel && (
        <div
          className="mt-4 flex items-center gap-2 border-t border-border/50 pt-3"
          aria-hidden="true"
        >
          {isPositive && <TrendingUp className="h-3 w-3 text-green-500" aria-hidden="true" />}
          {isNegative && <TrendingDown className="h-3 w-3 text-red-500" aria-hidden="true" />}
          <span
            className={`text-[11px] font-bold uppercase tracking-tight ${
              isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-muted-foreground'
            }`}
          >
            {changeLabel}
          </span>
        </div>
      )}
    </article>
  );
}
