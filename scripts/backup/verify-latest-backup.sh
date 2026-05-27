#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_OUTPUT_DIR:-./backups/postgres}"
latest_backup="$(ls -1t "$BACKUP_DIR"/*.dump 2>/dev/null | head -n 1 || true)"

if [ -z "$latest_backup" ]; then
  echo "[verify] No backup files found in $BACKUP_DIR" >&2
  exit 1
fi

checksum_file="${latest_backup}.sha256"
if [ ! -f "$checksum_file" ]; then
  echo "[verify] Missing checksum file for $latest_backup" >&2
  exit 1
fi

echo "[verify] Verifying checksum for $latest_backup"
sha256sum -c "$checksum_file"

echo "[verify] Verifying archive structure for $latest_backup"
pg_restore -l "$latest_backup" >/dev/null

echo "[verify] Latest backup is valid: $latest_backup"
