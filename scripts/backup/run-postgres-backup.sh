#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_OUTPUT_DIR:-/backups/daily}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-90}"
VERIFY_RESTORE="${VERIFY_RESTORE:-true}"
INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"
ALERT_WEBHOOK="${BACKUP_ALERT_WEBHOOK:-}"

mkdir -p "$BACKUP_DIR"

timestamp() {
  date -u +"%Y-%m-%dT%H-%M-%SZ"
}

notify_failure() {
  message="$1"
  echo "$message" >&2

  if [ -n "$ALERT_WEBHOOK" ]; then
    payload=$(printf '{"text":"%s"}' "$message")
    if command -v curl >/dev/null 2>&1; then
      curl -sS -X POST -H "Content-Type: application/json" -d "$payload" "$ALERT_WEBHOOK" >/dev/null || true
    fi
  fi
}

run_backup_once() {
  ts="$(timestamp)"
  backup_file="$BACKUP_DIR/postgres_${POSTGRES_DB}_${ts}.dump"
  checksum_file="$backup_file.sha256"

  echo "[backup] Starting backup to $backup_file"
  pg_dump -h "$POSTGRES_HOST" -p "${POSTGRES_PORT:-5432}" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "$backup_file"

  sha256sum "$backup_file" > "$checksum_file"
  echo "[backup] Backup checksum stored at $checksum_file"

  if [ "$VERIFY_RESTORE" = "true" ]; then
    if ! pg_restore -l "$backup_file" >/dev/null; then
      notify_failure "[backup] Verification failed for $backup_file"
      return 1
    fi
    echo "[backup] Verified archive readability for $backup_file"
  fi

  find "$BACKUP_DIR" -type f \( -name "*.dump" -o -name "*.sha256" \) -mtime +"$RETENTION_DAYS" -delete
  echo "[backup] Deleted backups older than $RETENTION_DAYS days"
}

if [ "${RUN_ONCE:-false}" = "true" ]; then
  run_backup_once
  exit 0
fi

echo "[backup] Starting scheduled backups every $INTERVAL_SECONDS seconds"
while true; do
  if ! run_backup_once; then
    notify_failure "[backup] Scheduled backup run failed for database $POSTGRES_DB"
  fi
  sleep "$INTERVAL_SECONDS"
done
