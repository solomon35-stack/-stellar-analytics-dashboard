import { DatabaseConnection, type HealthCheckResult } from '../database/connection';

jest.mock('pg', () => {
  const mockPool = {
    totalCount: 5,
    idleCount: 3,
    waitingCount: 0,
    connect: jest.fn(),
    end: jest.fn(),
    query: jest.fn(),
    on: jest.fn(),
  };
  return {
    Pool: jest.fn(() => mockPool),
    __mockPool: mockPool,
  };
});

jest.mock('redis', () => {
  const mockRedis = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    dbsize: jest.fn().mockResolvedValue(0),
    info: jest.fn().mockResolvedValue('used_memory:1000000'),
    setEx: jest.fn().mockResolvedValue('OK'),
    exists: jest.fn().mockResolvedValue(0),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    on: jest.fn(),
  };
  return {
    createClient: jest.fn(() => mockRedis),
    __mockRedis: mockRedis,
  };
});

const { __mockPool } = require('pg');
const { __mockRedis } = require('redis');

beforeEach(() => {
  jest.clearAllMocks();
  __mockPool.query.mockReset();
  __mockRedis.ping.mockReset();

  __mockPool.query.mockResolvedValue({ rows: [{ health_check: 1 }] });
  __mockRedis.ping.mockResolvedValue('PONG');

  __mockPool.totalCount = 5;
  __mockPool.idleCount = 3;
  __mockPool.waitingCount = 0;
});

process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';

describe('DatabaseConnection.healthCheck', () => {
  it('returns healthy status when all services respond', async () => {
    // Simulate DB size query
    __mockPool.query.mockImplementation((sql: string) => {
      if (sql.includes('pg_database_size')) {
        return Promise.resolve({ rows: [{ size_bytes: '1048576' }] });
      }
      if (sql.includes('pg_is_in_recovery')) {
        return Promise.resolve({
          rows: [{ is_replica: false, lag_ms: '0' }],
        });
      }
      return Promise.resolve({ rows: [{ health_check: 1 }] });
    });

    const db = DatabaseConnection.getInstance();
    const result = await db.healthCheck();

    expect(result.status).toBe('healthy');
    expect(result.postgres.status).toBe('connected');
    expect(result.postgres.poolStats.total).toBe(5);
    expect(result.postgres.poolStats.idle).toBe(3);
    expect(result.postgres.poolStats.waiting).toBe(0);
    expect(result.postgres.poolStats.max).toBe(20);
    expect(result.redis.status).toBe('connected');
    expect(result.database.sizeBytes).toBe(1048576);
    expect(result.database.sizeFormatted).toBe('1 MB');
    expect(result.replication.isReplica).toBe(false);
    expect(result.replication.lagMs).toBeNull();
    expect(result.queryMetrics.totalQueries).toBeGreaterThanOrEqual(0);
    expect(typeof result.postgres.latencyMs).toBe('number');
    expect(typeof result.redis.latencyMs).toBe('number');
    expect(typeof result.timestamp).toBe('string');
  });

  it('returns unhealthy when postgres fails', async () => {
    __mockPool.query.mockRejectedValue(new Error('connection refused'));

    const db = DatabaseConnection.getInstance();
    const result = await db.healthCheck();

    expect(result.status).toBe('unhealthy');
    expect(result.postgres.status).toBe('error');
  });

  it('returns unhealthy when redis fails', async () => {
    __mockRedis.ping.mockRejectedValue(new Error('connection refused'));
    __mockPool.query.mockImplementation((sql: string) => {
      if (sql.includes('pg_database_size')) {
        return Promise.resolve({ rows: [{ size_bytes: '0' }] });
      }
      if (sql.includes('pg_is_in_recovery')) {
        return Promise.resolve({
          rows: [{ is_replica: false, lag_ms: '0' }],
        });
      }
      return Promise.resolve({ rows: [{ health_check: 1 }] });
    });

    const db = DatabaseConnection.getInstance();
    const result = await db.healthCheck();

    expect(result.status).toBe('unhealthy');
    expect(result.redis.status).toBe('error');
  });

  it('returns degraded when postgres latency is high', async () => {
    __mockPool.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT 1 AS health_check')) {
        return new Promise((resolve) =>
          setTimeout(() => resolve({ rows: [{ health_check: 1 }] }), 600)
        );
      }
      if (sql.includes('pg_database_size')) {
        return { rows: [{ size_bytes: '0' }] };
      }
      if (sql.includes('pg_is_in_recovery')) {
        return { rows: [{ is_replica: false, lag_ms: '0' }] };
      }
      return { rows: [{ health_check: 1 }] };
    });

    const db = DatabaseConnection.getInstance();
    const result = await db.healthCheck();

    expect(result.status).toBe('degraded');
  });

  it('detects replication when isReplica is true', async () => {
    __mockPool.query.mockImplementation((sql: string) => {
      if (sql.includes('pg_database_size')) {
        return Promise.resolve({ rows: [{ size_bytes: '2097152' }] });
      }
      if (sql.includes('pg_is_in_recovery')) {
        return Promise.resolve({
          rows: [{ is_replica: true, lag_ms: '1500' }],
        });
      }
      return Promise.resolve({ rows: [{ health_check: 1 }] });
    });

    const db = DatabaseConnection.getInstance();
    const result = await db.healthCheck();

    expect(result.replication.isReplica).toBe(true);
    expect(result.replication.lagMs).toBe(1500);
    expect(result.database.sizeFormatted).toBe('2 MB');
  });

  it('formats database sizes correctly', async () => {
    __mockPool.query.mockImplementation((sql: string) => {
      if (sql.includes('pg_database_size')) {
        return Promise.resolve({ rows: [{ size_bytes: '1073741824' }] });
      }
      if (sql.includes('pg_is_in_recovery')) {
        return Promise.resolve({
          rows: [{ is_replica: false, lag_ms: '0' }],
        });
      }
      return Promise.resolve({ rows: [{ health_check: 1 }] });
    });

    const db = DatabaseConnection.getInstance();
    const result = await db.healthCheck();

    expect(result.database.sizeFormatted).toBe('1 GB');
  });

  it('handles database size query failure gracefully', async () => {
    let callCount = 0;
    __mockPool.query.mockImplementation((sql: string) => {
      callCount++;
      if (sql.includes('pg_database_size')) {
        return Promise.reject(new Error('permission denied'));
      }
      if (sql.includes('pg_is_in_recovery')) {
        return Promise.reject(new Error('not supported'));
      }
      return Promise.resolve({ rows: [{ health_check: 1 }] });
    });

    const db = DatabaseConnection.getInstance();
    const result = await db.healthCheck();

    expect(result.database.sizeBytes).toBe(0);
    expect(result.database.sizeFormatted).toBe('unknown');
    expect(result.replication.isReplica).toBe(false);
  });
});
