import path from 'path';
import migrate from 'node-pg-migrate';

export type MigrationDirection = 'up' | 'down';

export interface RunMigrationOptions {
  direction?: MigrationDirection;
  count?: number;
}

export async function runMigrations(options: RunMigrationOptions = {}): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run database migrations');
  }

  const direction = options.direction ?? 'up';
  const migrationsDir = path.join(__dirname, '../../migrations');

  await migrate({
    databaseUrl,
    dir: migrationsDir,
    direction,
    count: options.count,
    migrationsTable: 'pgmigrations',
    log: console.log,
    verbose: true,
    checkOrder: true,
  });
}
