#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_OUTPUT_DIR:-./backups/postgres}"
MAX_AGE_HOURS="${BACKUP_MAX_AGE_HOURS:-26}"
ALERT_WEBHOOK="${BACKUP_ALERT_WEBHOOK:-}"

latest_backup="$(ls -1t "$BACKUP_DIR"/*.dump 2>/dev/null | head -n 1 || true)"

notify_failure() {
  message="$1"
  echo "$message" >&2
  if [ -n "$ALERT_WEBHOOK" ] && command -v curl >/dev/null 2>&1; then
    payload=$(printf '{"text":"%s"}' "$message")
    curl -sS -X POST -H "Content-Type: application/json" -d "$payload" "$ALERT_WEBHOOK" >/dev/null || true
  fi
}

if [ -z "$latest_backup" ]; then
  notify_failure "[health] No backups found in $BACKUP_DIR"
  exit 1
fi

latest_mtime_epoch="$(date -r "$latest_backup" +%s)"
now_epoch="$(date +%s)"
age_hours="$(( (now_epoch - latest_mtime_epoch) / 3600 ))"

if [ "$age_hours" -gt "$MAX_AGE_HOURS" ]; then
  notify_failure "[health] Latest backup is too old: ${age_hours}h > ${MAX_AGE_HOURS}h ($latest_backup)"
  exit 1
fi

echo "[health] Backup freshness OK: ${age_hours}h old ($latest_backup)"
