#!/usr/bin/env bash
# Dumps the database to backups/expenses-YYYY-MM-DD_HHMMSS.dump (pg_dump custom format) and keeps the newest $KEEP dumps.
#
# Usage:   scripts/backup.sh [compose-file]        (default: docker-compose.prod.yml)
# Cron:    15 3 * * * cd /path/to/expense-tracker && mkdir -p backups && scripts/backup.sh >> backups/backup.log 2>&1
#          Generate that line with the right absolute path: echo "15 3 * * * cd $PWD && mkdir -p backups && scripts/backup.sh >> backups/backup.log 2>&1"
# Restore: see README.md, "Backups and restore".
set -euo pipefail

cd "$(dirname "$0")/.."

compose_file="${1:-docker-compose.prod.yml}"
keep="${KEEP:-30}"
backup_dir="${BACKUP_DIR:-backups}"
mkdir -p "$backup_dir"

target="$backup_dir/expenses-$(date +%Y-%m-%d_%H%M%S).dump"
partial="$target.partial"
trap 'rm -f "$partial"' EXIT

# Credentials come from the container's own environment, so nothing secret is passed on the command line.
docker compose -f "$compose_file" exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$partial"
mv "$partial" "$target"
echo "$(date '+%Y-%m-%dT%H:%M:%S') wrote $target ($(du -h "$target" | cut -f1))"

# Retention: delete everything but the newest $keep dumps.
ls -1t "$backup_dir"/expenses-*.dump | tail -n +"$((keep + 1))" | while IFS= read -r old; do
  rm -- "$old"
  echo "removed $old"
done
