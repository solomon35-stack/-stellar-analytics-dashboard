import { db } from '../database/connection';
import { buildCacheKey, cachedQuery } from '../database/cached-query';

const STATS_CACHE_TTL_SECONDS = Number(process.env.STATS_CACHE_TTL_SECONDS ?? 60);

async function fetchStatsSummary() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const summary = await db.queryOne<{
    total_ledgers: string;
    total_transactions: string;
    total_operations: string;
    total_accounts: string;
    total_assets: string;
    latest_ledger: number | null;
    latest_ledger_time: string | null;
    active_accounts_24h: string;
    active_accounts_7d: string;
    active_accounts_30d: string;
    volume_24h: string;
    volume_7d: string;
    volume_30d: string;
    average_fee_24h: string | null;
    success_rate_24h: string | null;
  }>(
    `
    SELECT
      (SELECT COUNT(*) FROM ledgers) AS total_ledgers,
      (SELECT COUNT(*) FROM transactions) AS total_transactions,
      (SELECT COUNT(*) FROM operations) AS total_operations,
      (SELECT COUNT(*) FROM accounts) AS total_accounts,
      (SELECT COUNT(*) FROM assets) AS total_assets,
      (SELECT sequence FROM ledgers ORDER BY sequence DESC LIMIT 1) AS latest_ledger,
      (SELECT closed_at FROM ledgers ORDER BY sequence DESC LIMIT 1) AS latest_ledger_time,
      (
        SELECT COUNT(DISTINCT source_account)
        FROM transactions
        WHERE created_at >= $1
      ) AS active_accounts_24h,
      (
        SELECT COUNT(DISTINCT source_account)
        FROM transactions
        WHERE created_at >= $2
      ) AS active_accounts_7d,
      (
        SELECT COUNT(DISTINCT source_account)
        FROM transactions
        WHERE created_at >= $3
      ) AS active_accounts_30d,
      (
        SELECT COALESCE(SUM(CAST(details->>'amount' AS NUMERIC)), 0)
        FROM operations
        WHERE type = 'payment' AND created_at >= $1
      ) AS volume_24h,
      (
        SELECT COALESCE(SUM(CAST(details->>'amount' AS NUMERIC)), 0)
        FROM operations
        WHERE type = 'payment' AND created_at >= $2
      ) AS volume_7d,
      (
        SELECT COALESCE(SUM(CAST(details->>'amount' AS NUMERIC)), 0)
        FROM operations
        WHERE type = 'payment' AND created_at >= $3
      ) AS volume_30d,
      (
        SELECT AVG(fee_charged)
        FROM transactions
        WHERE created_at >= $1
      ) AS average_fee_24h,
      (
        SELECT
          CASE
            WHEN COUNT(*) > 0 THEN (COUNT(CASE WHEN successful THEN 1 END) * 100.0 / COUNT(*))
            ELSE 0
          END
        FROM transactions
        WHERE created_at >= $1
      ) AS success_rate_24h
    `,
    [oneDayAgo, sevenDaysAgo, thirtyDaysAgo]
  );

  if (!summary) {
    throw new Error('Failed to compute stats summary');
  }

  return {
    totalLedgers: parseInt(summary.total_ledgers, 10),
    totalTransactions: parseInt(summary.total_transactions, 10),
    totalOperations: parseInt(summary.total_operations, 10),
    totalAccounts: parseInt(summary.total_accounts, 10),
    totalAssets: parseInt(summary.total_assets, 10),
    activeAccounts24h: parseInt(summary.active_accounts_24h, 10),
    activeAccounts7d: parseInt(summary.active_accounts_7d, 10),
    activeAccounts30d: parseInt(summary.active_accounts_30d, 10),
    volume24h: summary.volume_24h,
    volume7d: summary.volume_7d,
    volume30d: summary.volume_30d,
    averageFee24h: parseFloat(summary.average_fee_24h ?? '0') || 0,
    successRate24h: parseFloat(summary.success_rate_24h ?? '0') || 0,
    latestLedger: summary.latest_ledger,
    latestLedgerTime: summary.latest_ledger_time,
  };
}

export async function getStatsSummary() {
  const cacheKey = buildCacheKey('stats', { scope: 'summary' });
  return cachedQuery(cacheKey, STATS_CACHE_TTL_SECONDS, fetchStatsSummary);
}
