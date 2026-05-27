# Database Migrations

Schema changes are managed with [node-pg-migrate](https://github.com/salsita/node-pg-migrate) in `packages/indexer`.

## Overview

- Migration files: `packages/indexer/migrations/`
- Version history table: `pgmigrations`
- Config: `packages/indexer/.node-pg-migraterc`
- Initial migration: `1738000000000_initial-schema.js`

## Prerequisites

Set `DATABASE_URL` before running migrations:

```bash
export DATABASE_URL=postgresql://stellar:stellar@localhost:5432/stellar_analytics
```

## Commands

From repository root:

```bash
pnpm db:migrate
pnpm db:migrate:down
```

From `packages/indexer`:

```bash
pnpm db:migrate              # apply pending migrations
pnpm db:migrate:down         # rollback last migration
pnpm db:migrate:create add_feature_x   # scaffold new migration
pnpm db:migrate:redo         # rollback + re-apply last migration
```

The indexer also runs pending migrations automatically on startup.

## Creating a New Migration

1. Create migration file:

```bash
pnpm --filter @stellar-analytics/indexer db:migrate:create add_new_table
```

2. Implement `exports.up` and `exports.down` in the generated file.
3. Test locally:

```bash
pnpm db:migrate
pnpm db:migrate:down
pnpm db:migrate
```

4. Commit the migration file with application code that depends on it.

## Rollback

Rollback one migration:

```bash
pnpm db:migrate:down
```

Rollback multiple migrations:

```bash
pnpm --filter @stellar-analytics/indexer exec ts-node src/database/migrate.ts --down --count=2
```

Always implement `exports.down` for reversible changes.

## Existing Databases (Pre-Migration)

If your database was created from legacy `schema.sql` and already contains tables:

1. Verify schema matches the initial migration intent.
2. Mark the initial migration as applied without executing SQL:

```bash
cd packages/indexer
node-pg-migrate up 1738000000000_initial-schema --fake -f .node-pg-migraterc
```

3. Run future migrations normally with `pnpm db:migrate`.

For fresh environments, run `pnpm db:migrate` only.

## CI/CD

GitHub Actions workflow `.github/workflows/database-migrations.yml` validates:

- `db:migrate` on empty Postgres
- migration history presence
- rollback (`db:migrate:down`)
- re-apply (`db:migrate`)

## Operational Notes

- Do not edit applied migration files in production; create a new migration instead.
- Prefer additive migrations (new columns/tables) over destructive changes.
- Take a backup before production migrations (see `docs/backup-disaster-recovery.md`).
- Keep `schema.sql` as a human-readable reference only; migrations are the source of truth.
