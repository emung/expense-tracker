#!/usr/bin/env bash
# Runs ExpenseTracker on this Mac for day-to-day use: built images that restart with Docker,
# and its own database (volume expense-tracker-mac_pgdata), separate from development.
set -euo pipefail

usage() {
  cat >&2 <<'EOF'
Usage: scripts/mac-app.sh <command>
  up        build what changed, start, wait until healthy, print the URL
  down      stop and remove the containers (the data volume is kept)
  restart   restart the running containers
  status    show containers and their health
  logs      follow logs, optionally for one service: logs backend
  backup    dump the database to backups/mac/
EOF
}

case "${1:-}" in
  up | down | restart | status | logs | backup) ;;
  *)
    usage
    exit 2
    ;;
esac

# IDEs started from the Dock don't inherit the shell PATH; add the usual Docker CLI locations.
export PATH="/usr/local/bin:/opt/homebrew/bin:$HOME/.orbstack/bin:$PATH"
cd "$(dirname "$0")/.."

env_file=".env.mac"
if [ ! -f "$env_file" ]; then
  echo "Missing $env_file: copy .env.mac.example to $env_file and set POSTGRES_PASSWORD." >&2
  exit 1
fi

# Exported values win over the development .env that docker compose would otherwise read.
set -a
. "./$env_file"
set +a
export COMPOSE_PROJECT_NAME="expense-tracker-mac"
export COMPOSE_FILE="docker-compose.prod.yml"

case "${1:-}" in
  up)
    docker compose up --detach --build --wait
    echo "ExpenseTracker is running at http://localhost:${APP_PORT:-80}"
    ;;
  down)
    docker compose down
    ;;
  restart)
    docker compose restart
    ;;
  status)
    docker compose ps
    ;;
  logs)
    shift
    docker compose logs --follow --tail=200 "$@"
    ;;
  backup)
    BACKUP_DIR="backups/mac" scripts/backup.sh "$COMPOSE_FILE"
    ;;
  *)
    usage
    exit 2
    ;;
esac
