/**
 * DashboardPage (issue #49)
 *
 * Replaces stub data with real API calls via useDashboardData.
 * Handles loading states, API errors, and retry logic.
 */
import { TransactionsChart } from "../components/TransactionsChart";
import { useDashboardData } from "../hooks/useDashboardData";

export function DashboardPage() {
  const { data, loading, error, retry } = useDashboardData();

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <main className="app">
        <h1>Stellar Analytics Dashboard</h1>
        <div className="grid">
          {[0, 1, 2, 3].map((i) => (
            <article key={i} className="card skeleton" aria-busy="true">
              <div className="skeleton-line" style={{ width: "60%", height: "14px", marginBottom: "8px" }} />
              <div className="skeleton-line" style={{ width: "40%", height: "28px" }} />
            </article>
          ))}
        </div>
      </main>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error && !data) {
    return (
      <main className="app">
        <h1>Stellar Analytics Dashboard</h1>
        <div
          role="alert"
          style={{
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "16px",
          }}
        >
          <h2 style={{ margin: "0 0 8px", color: "#dc2626", fontSize: "16px" }}>
            Failed to load dashboard data
          </h2>
          <p style={{ margin: "0 0 12px", color: "#6b7280", fontSize: "14px" }}>
            {error.message}
          </p>
          <button
            onClick={retry}
            style={{
              background: "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  // ── Data state ─────────────────────────────────────────────────────────────
  const stats = data!;

  const metrics = [
    { label: "Total Ledgers", value: stats.totalLedgers.toLocaleString() },
    { label: "Total Transactions", value: stats.totalTransactions.toLocaleString() },
    { label: "Total Operations", value: stats.totalOperations.toLocaleString() },
    { label: "Total Accounts", value: stats.totalAccounts.toLocaleString() },
    { label: "Active Accounts (24h)", value: stats.activeAccounts24h.toLocaleString() },
    { label: "Volume (24h)", value: stats.volume24h },
    { label: "Avg Fee (24h)", value: `${stats.averageFee24h.toFixed(0)} str` },
    { label: "Success Rate (24h)", value: `${stats.successRate24h.toFixed(1)}%` },
  ];

  return (
    <main className="app">
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: 0 }}>Stellar Analytics Dashboard</h1>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "14px" }}>
            Network:{" "}
            <strong style={{ textTransform: "capitalize" }}>{stats.network}</strong>
            {stats.latestLedger !== null && (
              <> &nbsp;·&nbsp; Latest ledger: <strong>#{stats.latestLedger}</strong></>
            )}
          </p>
        </div>

        {/* Soft refresh indicator while polling */}
        {loading && (
          <span
            aria-label="Refreshing data"
            style={{ fontSize: "12px", color: "#9ca3af" }}
          >
            ↻ Refreshing…
          </span>
        )}
      </header>

      {/* Soft error banner (partial data available) */}
      {error && data && (
        <div
          role="alert"
          style={{
            background: "#fffbeb",
            border: "1px solid #fcd34d",
            borderRadius: "8px",
            padding: "10px 16px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "13px",
          }}
        >
          <span style={{ color: "#92400e" }}>
            Could not refresh data: {error.message}
          </span>
          <button
            onClick={retry}
            style={{
              background: "transparent",
              border: "1px solid #d97706",
              borderRadius: "6px",
              padding: "4px 10px",
              cursor: "pointer",
              color: "#92400e",
              fontSize: "12px",
            }}
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid">
        {metrics.map(({ label, value }) => (
          <article key={label} className="card">
            <h3 style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280" }}>
              {label}
            </h3>
            <p style={{ margin: 0, fontSize: "24px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {value}
            </p>
          </article>
        ))}
      </div>

      <div className="grid" style={{ marginTop: "24px" }}>
        <TransactionsChart />
      </div>
    </main>
  );
}
