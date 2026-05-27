/**
 * TransactionsChart — legacy frontend stub
 *
 * This package (frontend/) is the original scaffold. The full implementation
 * lives in packages/frontend/src/components/TransactionsChart.tsx.
 *
 * This stub renders a minimal chart using only the data available from
 * the useDashboardData hook so the old app still compiles.
 */
export function TransactionsChart() {
  return (
    <section
      style={{
        background: 'var(--card, #fff)',
        border: '1px solid var(--border, #e5e7eb)',
        borderRadius: '12px',
        padding: '24px',
      }}
    >
      <h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>
        Transaction Volume
      </h3>
      <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>
        Full interactive charts are available in the main dashboard at{' '}
        <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>
          packages/frontend
        </code>
        .
      </p>
    </section>
  );
}
