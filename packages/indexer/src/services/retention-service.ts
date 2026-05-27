import { db } from '../database/connection';
import winston from 'winston';

export const RETENTION_PERIODS = {
  LEDGERS_DAYS: 365,
  TRANSACTIONS_DAYS: 180,
  OPERATIONS_DAYS: 180,
  PAYMENTS_DAYS: 90,
  NETWORK_METRICS_DAYS: 365,
  ASSET_METRICS_DAYS: 90,
  ACCOUNT_METRICS_DAYS: 90,
} as const;

export class RetentionService {
  private running = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private logger: winston.Logger;

  constructor(private intervalMs = 24 * 60 * 60 * 1000) {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
      ],
    });
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.timer = setInterval(() => this.applyRetention(), this.intervalMs);
    this.logger.info('Retention service started');
    await this.applyRetention();
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.logger.info('Retention service stopped');
  }

  private async applyRetention(): Promise<void> {
    this.logger.info('Applying data retention policies...');

    const now = new Date();
    const cutoffDate = new Date(now.getTime() - RETENTION_PERIODS.LEDGERS_DAYS * 24 * 60 * 60 * 1000);

    try {
      // Archive and delete old ledgers
      await this.archiveAndDelete('ledgers', cutoffDate, [
        'sequence', 'hash', 'closed_at', 'tx_count', 'created_at'
      ]);

      // Archive and delete old transactions
      const txCutoff = new Date(now.getTime() - RETENTION_PERIODS.TRANSACTIONS_DAYS * 24 * 60 * 60 * 1000);
      await this.archiveAndDelete('transactions', txCutoff, [
        'hash', 'ledger_sequence', 'source_account', 'fee_charged', 'created_at'
      ]);

      // Archive and delete old operations
      const opCutoff = new Date(now.getTime() - RETENTION_PERIODS.OPERATIONS_DAYS * 24 * 60 * 60 * 1000);
      await this.archiveAndDelete('operations', opCutoff, [
        'id', 'tx_hash', 'type', 'source_account', 'created_at'
      ]);

      // Archive and delete old payments
      const payCutoff = new Date(now.getTime() - RETENTION_PERIODS.PAYMENTS_DAYS * 24 * 60 * 60 * 1000);
      await this.archiveAndDelete('payments', payCutoff, [
        'id', '"from"', '"to"', 'amount', 'asset', 'created_at'
      ]);

      this.logger.info('Data retention policies applied successfully');
    } catch (error) {
      this.logger.error('Error applying retention policies:', error);
    }
  }

  private async archiveAndDelete(table: string, cutoff: Date, columns: string[]): Promise<void> {
    const archiveTable = `${table}_archive`;

    const oldRecords = await db.query(
      `SELECT ${columns.join(', ')} FROM ${table} WHERE created_at < $1 LIMIT 1000`,
      [cutoff]
    );

    if (oldRecords.length > 0) {
      for (const record of oldRecords) {
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const values = columns.map(col => {
          const key = col.replace(/"/g, '');
          return record[key];
        });

        await db.query(
          `INSERT INTO ${archiveTable} (${columns.join(', ')}) VALUES (${placeholders}) 
           ON CONFLICT DO NOTHING`,
          values
        );
      }

      await db.query(
        `DELETE FROM ${table} WHERE created_at < $1`,
        [cutoff]
      );

      this.logger.info(`Archived and deleted ${oldRecords.length} records from ${table}`);
    }
  }

  async getRetentionStatus(): Promise<Record<string, { count: number; oldest: Date | null }>> {
    const tables = ['ledgers', 'transactions', 'operations', 'payments'];
    const status: Record<string, { count: number; oldest: Date | null }> = {};

    for (const table of tables) {
      const result = await db.queryOne(
        `SELECT COUNT(*) as count, MIN(created_at) as oldest FROM ${table}`,
        []
      );
      status[table] = {
        count: parseInt(result.count),
        oldest: result.oldest,
      };
    }

    return status;
  }

  generateComplianceReport(): Record<string, any> {
    return {
      retentionPolicy: RETENTION_PERIODS,
      generatedAt: new Date().toISOString(),
      tablesWithArchival: ['ledgers_archive', 'transactions_archive', 'operations_archive', 'payments_archive'],
    };
  }
}