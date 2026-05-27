/**
 * LedgerTimelineChart
 *
 * Visualises the ledger chain as a timeline showing:
 * - Transaction density per ledger (bar)
 * - Operation count (line overlay)
 * - Success vs fail breakdown (stacked)
 * - Protocol version markers
 *
 * Supports export as PNG or CSV.
 */
import { useState, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush,
  ResponsiveContainer,
  Cell,
  type TooltipProps,
} from 'recharts';
import { format } from 'date-fns';
import { Database, Download, ImageIcon, RefreshCcw, Activity } from 'lucide-react';
import { clsx } from 'clsx';
import { LEDGERS_QUERY } from '@/graphql/queries';

// ── types ─────────────────────────────────────────────────────────────────────

interface LedgerPoint {
  sequence: number;
  successfulTx: number;
  failedTx: number;
  operationCount: number;
  closedAt: string;
  protocolVersion: number;
  totalTx: number;
  successRate: number;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function generateMockLedgers(count = 40): LedgerPoint[] {
  const base = 50_000_000;
  return Array.from({ length: count }, (_, i) => {
    const successful = Math.round(5 + Math.random() * 45);
    const failed = Math.round(Math.random() * 5);
    return {
      sequence: base + i,
      successfulTx: successful,
      failedTx: failed,
      totalTx: successful + failed,
      operationCount: Math.round((successful + failed) * (1.5 + Math.random())),
      closedAt: new Date(Date.now() - (count - i) * 5_000).toISOString(),
      protocolVersion: 21,
      successRate: parseFloat(((successful / (successful + failed)) * 100).toFixed(1)),
    };
  });
}

// ── custom tooltip ────────────────────────────────────────────────────────────

function LedgerTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as LedgerPoint;
  if (!d) return null;

  return (
    <div className="bg-card border border-border rounded-xl shadow-xl p-3 text-xs min-w-[160px]">
      <p className="font-bold text-primary mb-1.5 font-mono">#{d.sequence}</p>
      <p className="text-muted-foreground mb-2 border-b border-border pb-1.5">
        {format(new Date(d.closedAt), 'MMM dd HH:mm:ss')}
      </p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-green-500">✓ Successful</span>
          <span className="font-mono font-semibold text-green-500">{d.successfulTx}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-red-500">✗ Failed</span>
          <span className="font-mono font-semibold text-red-500">{d.failedTx}</span>
        </div>
        <div className="flex justify-between gap-4 border-t border-border pt-1.5 mt-1">
          <span className="text-muted-foreground">Operations</span>
          <span className="font-mono">{d.operationCount}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Success rate</span>
          <span className="font-mono text-purple-500">{d.successRate}%</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Protocol</span>
          <span className="font-mono">v{d.protocolVersion}</span>
        </div>
      </div>
    </div>
  );
}

// ── export helpers ────────────────────────────────────────────────────────────

function exportCSV(data: LedgerPoint[]) {
  const headers = ['sequence', 'closedAt', 'successfulTx', 'failedTx', 'operationCount', 'successRate', 'protocolVersion'];
  const rows = data.map((d) => [d.sequence, d.closedAt, d.successfulTx, d.failedTx, d.operationCount, d.successRate, d.protocolVersion]);
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `ledger-timeline-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
}

function exportPNG(ref: React.RefObject<HTMLDivElement>) {
  const svg = ref.current?.querySelector('svg');
  if (!svg) return;
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svg);
  const canvas = document.createElement('canvas');
  const { width, height } = svg.getBoundingClientRect();
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);
  const img = new Image();
  img.onload = () => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0);
    const link = document.createElement('a');
    link.download = `ledger-timeline-${format(new Date(), 'yyyy-MM-dd')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgStr)))}`;
}

// ── component ─────────────────────────────────────────────────────────────────

type ViewMode = 'stacked' | 'total' | 'ops';

export function LedgerTimelineChart() {
  const [viewMode, setViewMode] = useState<ViewMode>('stacked');
  const chartRef = useRef<HTMLDivElement>(null);

  const { data, loading, refetch } = useQuery(LEDGERS_QUERY, {
    variables: { first: 50 },
    pollInterval: 5_000,
    notifyOnNetworkStatusChange: true,
  });

  const chartData: LedgerPoint[] = useMemo(() => {
    const raw = data?.ledgers?.edges?.map((e: any) => e.node) ?? [];
    if (!raw.length) return generateMockLedgers(40);

    return [...raw]
      .reverse()
      .map((l: any) => ({
        sequence: l.sequence,
        successfulTx: l.successfulTransactionCount ?? 0,
        failedTx: l.failedTransactionCount ?? 0,
        totalTx: (l.successfulTransactionCount ?? 0) + (l.failedTransactionCount ?? 0),
        operationCount: l.operationCount ?? 0,
        closedAt: l.closedAt,
        protocolVersion: l.protocolVersion ?? 21,
        successRate: parseFloat(
          (
            ((l.successfulTransactionCount ?? 0) /
              Math.max(1, (l.successfulTransactionCount ?? 0) + (l.failedTransactionCount ?? 0))) *
            100
          ).toFixed(1)
        ),
      }));
  }, [data]);

  // Colour bars by density
  const maxTx = useMemo(() => Math.max(...chartData.map((d) => d.totalTx), 1), [chartData]);

  const handleExportCSV = useCallback(() => exportCSV(chartData), [chartData]);
  const handleExportPNG = useCallback(() => exportPNG(chartRef), []);

  const VIEW_MODES: { key: ViewMode; label: string }[] = [
    { key: 'stacked', label: 'Success/Fail' },
    { key: 'total', label: 'Total' },
    { key: 'ops', label: 'Operations' },
  ];

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-border/60">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold tracking-tight flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Ledger Timeline
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Transaction density across recent ledgers
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View mode */}
            <div className="flex items-center gap-0.5 bg-muted/50 p-0.5 rounded-lg border border-border">
              {VIEW_MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setViewMode(m.key)}
                  className={clsx(
                    'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                    viewMode === m.key
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => refetch()}
              disabled={loading}
              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <RefreshCcw className={clsx('h-3.5 w-3.5', loading && 'animate-spin')} />
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </button>
            <button
              onClick={handleExportPNG}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              PNG
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div ref={chartRef} className="px-2 pt-4 pb-2">
        {loading && !chartData.length ? (
          <div className="h-64 bg-muted/20 animate-pulse rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />

              <XAxis
                dataKey="sequence"
                tickFormatter={(v) => `#${v}`}
                stroke="hsl(var(--muted-foreground))"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />

              <YAxis
                yAxisId="left"
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={36}
              />

              {viewMode === 'ops' && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#10b981"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
              )}

              <Tooltip content={<LedgerTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} iconType="circle" iconSize={8} />

              {/* Stacked success/fail bars */}
              {viewMode === 'stacked' && (
                <>
                  <Bar yAxisId="left" dataKey="successfulTx" name="Successful" stackId="a" fill="#10b981" fillOpacity={0.85} maxBarSize={16} radius={[0, 0, 0, 0]} />
                  <Bar yAxisId="left" dataKey="failedTx" name="Failed" stackId="a" fill="#ef4444" fillOpacity={0.85} maxBarSize={16} radius={[2, 2, 0, 0]} />
                </>
              )}

              {/* Total bars with density colouring */}
              {viewMode === 'total' && (
                <Bar yAxisId="left" dataKey="totalTx" name="Transactions" maxBarSize={16} radius={[2, 2, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`hsl(var(--primary) / ${0.3 + (entry.totalTx / maxTx) * 0.7})`}
                    />
                  ))}
                </Bar>
              )}

              {/* Operations view */}
              {viewMode === 'ops' && (
                <>
                  <Bar yAxisId="left" dataKey="totalTx" name="Transactions" fill="hsl(var(--primary))" fillOpacity={0.6} maxBarSize={16} radius={[2, 2, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="operationCount" name="Operations" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                </>
              )}

              <Brush
                dataKey="sequence"
                height={20}
                stroke="hsl(var(--border))"
                fill="hsl(var(--muted))"
                travellerWidth={6}
                tickFormatter={(v) => `#${v}`}
                startIndex={Math.max(0, chartData.length - 20)}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-2 border-t border-border/40 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
          <Activity className="h-2.5 w-2.5" />
          {chartData.length} ledgers · live polling every 5s
        </span>
        {loading && (
          <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
            <RefreshCcw className="h-2.5 w-2.5 animate-spin" />
            Syncing…
          </span>
        )}
      </div>
    </div>
  );
}
