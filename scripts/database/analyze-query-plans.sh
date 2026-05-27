#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

echo "Analyzing key query execution plans..."
echo

run_explain() {
  title="$1"
  sql="$2"
  echo "=== $title ==="
  psql "$DATABASE_URL" -c "EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) $sql"
  echo
}

run_explain "Recent transactions" \
  "SELECT id, hash, created_at FROM transactions ORDER BY created_at DESC LIMIT 20"

run_explain "Transactions by account (24h)" \
  "SELECT COUNT(DISTINCT source_account) FROM transactions WHERE created_at >= NOW() - INTERVAL '24 hours'"

run_explain "Operations by type (payment)" \
  "SELECT COALESCE(SUM(CAST(details->>'amount' AS NUMERIC)), 0) FROM operations WHERE type = 'payment' AND created_at >= NOW() - INTERVAL '24 hours'"

run_explain "Operations for transaction hashes" \
  "SELECT id, transaction_hash, operation_index FROM operations WHERE transaction_hash = ANY(ARRAY['sample-hash']) ORDER BY operation_index"

run_explain "Network metrics range" \
  "SELECT timestamp, transaction_count FROM network_metrics WHERE timestamp >= NOW() - INTERVAL '7 days' ORDER BY timestamp DESC LIMIT 100"

run_explain "Account metrics by account" \
  "SELECT account_id, timestamp FROM account_metrics WHERE account_id = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF' ORDER BY timestamp DESC LIMIT 100"

echo "Done. Review plans for sequential scans and high actual row counts."
