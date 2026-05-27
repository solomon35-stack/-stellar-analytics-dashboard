import { Pool, PoolClient } from 'pg';
import { createClient } from 'redis';
import winston from 'winston';

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  NETWORK_STATS: 60,
  LEDGER_DATA: 300,
  ACCOUNT_STATS: 300,
  ASSET_DATA: 300,
} as const;

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool;
  private redis: ReturnType<typeof createClient>;
  private logger: winston.Logger;

  private constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
      ],
    });

    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.redis = createClient({
      url: process.env.REDIS_URL,
    });

    this.setupErrorHandling();
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  private setupErrorHandling(): void {
    this.pool.on('error', (err) => {
      this.logger.error('PostgreSQL pool error:', err);
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis client error:', err);
    });
  }

  public async connect(): Promise<void> {
    try {
      await this.pool.connect();
      await this.redis.connect();
      this.logger.info('Database connections established');
    } catch (error) {
      this.logger.error('Failed to connect to databases:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.pool.end();
      await this.redis.disconnect();
      this.logger.info('Database connections closed');
    } catch (error) {
      this.logger.error('Error closing database connections:', error);
      throw error;
    }
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  public getRedis(): ReturnType<typeof createClient> {
    return this.redis;
  }

  public async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(text, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  public async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const rows = await this.query<T>(text, params);
    return rows.length > 0 ? rows[0] : null;
  }

  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Redis helper methods
  public async cacheSet(key: string, value: any, ttl?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);
    if (ttl) {
      await this.redis.setEx(key, ttl, serializedValue);
    } else {
      await this.redis.set(key, serializedValue);
    }
  }

  public async cacheGet<T = any>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  public async cacheDel(key: string): Promise<void> {
    await this.redis.del(key);
  }

  public async cacheExists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  // Cache monitoring
  public async getCacheStats(): Promise<{ keys: number; memory: string }> {
    const keys = await this.redis.dbsize();
    const info = await this.redis.info('memory');
    return { keys, memory: info || 'unknown' };
  }

  public async incrementCacheMetric(metric: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const key = `cache:${metric}:${today}`;
    await this.redis.incr(key);
    await this.redis.expire(key, 86400 * 7); // Keep for 7 days
  }

  public async getCacheMetrics(metric: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const key = `cache:${metric}:${today}`;
    const value = await this.redis.get(key);
    return value ? parseInt(value) : 0;
  }
}

export const db = DatabaseConnection.getInstance();
