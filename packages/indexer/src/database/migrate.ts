import dotenv from 'dotenv';
import { runMigrations, type MigrationDirection } from './migration-runner';

dotenv.config();

function parseCliArgs(): { direction: MigrationDirection; count?: number } {
  const args = process.argv.slice(2);
  const direction: MigrationDirection = args.includes('--down') ? 'down' : 'up';
  const countArg = args.find((arg) => arg.startsWith('--count='));
  const count = countArg ? Number.parseInt(countArg.split('=')[1], 10) : undefined;

  return { direction, count };
}

async function main(): Promise<void> {
  const { direction, count } = parseCliArgs();
  console.log(`Running database migrations (${direction})...`);
  await runMigrations({ direction, count });
  console.log('Database migrations completed successfully');
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error running migrations:', error);
      process.exit(1);
    });
}

export { runMigrations };
