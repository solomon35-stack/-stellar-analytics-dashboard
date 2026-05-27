export interface QueryExecutionRecord {
  sql: string;
  durationMs: number;
  timestamp: string;
  rowCount?: number;
}

export interface QueryMetricsSnapshot {
  totalQueries: number;
  slowQueries: number;
  totalDurationMs: number;
  averageDurationMs: number;
  recentSlowQueries: QueryExecutionRecord[];
}

const SLOW_QUERY_THRESHOLD_MS = Number(process.env.SLOW_QUERY_THRESHOLD_MS ?? 100);
const MAX_SLOW_QUERY_LOG = Number(process.env.SLOW_QUERY_LOG_SIZE ?? 50);

let totalQueries = 0;
let slowQueries = 0;
let totalDurationMs = 0;
const recentSlowQueries: QueryExecutionRecord[] = [];

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim().slice(0, 500);
}

export function recordQueryExecution(
  sql: string,
  durationMs: number,
  rowCount?: number,
  logger?: { warn: (message: string, meta?: Record<string, unknown>) => void }
): void {
  totalQueries += 1;
  totalDurationMs += durationMs;

  if (durationMs < SLOW_QUERY_THRESHOLD_MS) {
    return;
  }

  slowQueries += 1;

  const record: QueryExecutionRecord = {
    sql: normalizeSql(sql),
    durationMs: Math.round(durationMs * 100) / 100,
    timestamp: new Date().toISOString(),
    rowCount,
  };

  recentSlowQueries.unshift(record);
  if (recentSlowQueries.length > MAX_SLOW_QUERY_LOG) {
    recentSlowQueries.length = MAX_SLOW_QUERY_LOG;
  }

  logger?.warn('Slow database query detected', {
    durationMs: record.durationMs,
    rowCount: record.rowCount,
    sql: record.sql,
  });
}

export function getQueryMetrics(): QueryMetricsSnapshot {
  return {
    totalQueries,
    slowQueries,
    totalDurationMs: Math.round(totalDurationMs * 100) / 100,
    averageDurationMs:
      totalQueries > 0 ? Math.round((totalDurationMs / totalQueries) * 100) / 100 : 0,
    recentSlowQueries: [...recentSlowQueries],
  };
}

export function formatQueryMetricsPrometheus(): string {
  const metrics = getQueryMetrics();
  return [
    '# HELP db_queries_total Total database queries executed',
    '# TYPE db_queries_total counter',
    `db_queries_total ${metrics.totalQueries}`,
    '# HELP db_slow_queries_total Total slow database queries',
    '# TYPE db_slow_queries_total counter',
    `db_slow_queries_total ${metrics.slowQueries}`,
    '# HELP db_query_duration_ms_total Cumulative query duration in milliseconds',
    '# TYPE db_query_duration_ms_total counter',
    `db_query_duration_ms_total ${metrics.totalDurationMs}`,
    '# HELP db_query_duration_ms_avg Average query duration in milliseconds',
    '# TYPE db_query_duration_ms_avg gauge',
    `db_query_duration_ms_avg ${metrics.averageDurationMs}`,
  ].join('\n');
}

export function resetQueryMetricsForTests(): void {
  totalQueries = 0;
  slowQueries = 0;
  totalDurationMs = 0;
  recentSlowQueries.length = 0;
}
