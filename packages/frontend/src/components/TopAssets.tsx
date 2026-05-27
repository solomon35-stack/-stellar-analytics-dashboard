import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useQuery } from '@apollo/client';
import { ASSET_METRICS_QUERY } from '@/graphql/queries';

export function TopAssets() {
  const { data, loading } = useQuery(ASSET_METRICS_QUERY, {
    variables: { first: 5, timeRange: { last: '24h' } },
    pollInterval: 30000,
  });

  if (loading) {
    return (
      <div
        className="h-80 bg-muted/30 animate-pulse rounded-xl"
        role="status"
        aria-label="Loading market leaders chart"
        aria-busy="true"
      />
    );
  }

  const chartData =
    data?.assetMetrics?.map((m: any) => ({
      name: m.asset.native ? 'XLM' : m.asset.assetCode,
      volume: parseFloat(m.volume24h),
    })) || [];

  return (
    <section
      aria-labelledby="top-assets-heading"
      className="bg-card p-6 rounded-xl border border-border shadow-sm"
    >
      <h2
        id="top-assets-heading"
        className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6"
      >
        Market Leaders
      </h2>

      {/* Accessible data table — screen readers get the actual numbers */}
      <div className="sr-only">
        <table aria-label="Top assets by 24-hour volume">
          <caption>Top 5 assets by 24-hour trading volume</caption>
          <thead>
            <tr>
              <th scope="col">Asset</th>
              <th scope="col">24h Volume (XLM)</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((d) => (
              <tr key={d.name}>
                <td>{d.name}</td>
                <td>{d.volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Visual chart — hidden from screen readers since data table above covers it */}
      <div
        className="h-80 w-full"
        role="img"
        aria-label="Bar chart showing top 5 assets by 24-hour volume"
        aria-hidden="false"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 30 }}>
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              axisLine={false}
              tickLine={false}
              width={60}
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 700 }}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted)/0.1)' }}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [
                value.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' XLM',
                '24h Volume',
              ]}
            />
            <Bar dataKey="volume" radius={[0, 4, 4, 0]} barSize={24}>
              {chartData.map((_entry: any, index: number) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`hsl(var(--primary) / ${Math.max(0.3, 1 - index * 0.15)})`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
