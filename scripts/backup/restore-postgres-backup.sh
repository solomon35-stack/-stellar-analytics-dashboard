#!/bin/sh
set -eu

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <backup_file.dump> [target_database]" >&2
  exit 1
fi

BACKUP_FILE="$1"
TARGET_DB="${2:-${POSTGRES_DB}}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "[restore] Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

echo "[restore] Dropping and recreating database: $TARGET_DB"
psql -h "$POSTGRES_HOST" -p "${POSTGRES_PORT:-5432}" -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${TARGET_DB}' AND pid <> pg_backend_pid();" \
  -c "DROP DATABASE IF EXISTS \"${TARGET_DB}\";" \
  -c "CREATE DATABASE \"${TARGET_DB}\";"

echo "[restore] Restoring backup from $BACKUP_FILE to $TARGET_DB"
pg_restore -h "$POSTGRES_HOST" -p "${POSTGRES_PORT:-5432}" -U "$POSTGRES_USER" -d "$TARGET_DB" --clean --if-exists "$BACKUP_FILE"

echo "[restore] Restore completed successfully"
