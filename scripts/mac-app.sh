#!/usr/bin/env bash
# Runs ExpenseTracker on this Mac for day-to-day use: built images that restart with Docker,
# and its own database (volume expense-tracker-mac_pgdata), separate from development.
set -euo pipefail

usage() {
  cat >&2 <<'EOF'
Usage: scripts/mac-app.sh <command>
  up            build what changed, start, wait until healthy, print the URL
  down          stop and remove the containers (the data volume is kept)
  restart       restart the running containers
  status        show containers and their health
  logs          follow logs, optionally for one service: logs backend
  backup        dump the database to backups/mac/
  hosts         point the frontend's .orb.local name at its current IP in /etc/hosts (needs sudo)
  hosts remove  drop that entry again
EOF
}

case "${1:-}" in
  up | down | restart | status | logs | backup | hosts) ;;
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

# OrbStack publishes this name over mDNS only. macOS resolves it, and so do curl and Safari, but
# Chromium browsers (Chrome, Vivaldi, Edge) resolve with their own DNS client, which never asks
# macOS and never speaks mDNS - there the name fails with NXDOMAIN. /etc/hosts is the one place
# both resolvers agree, which is what the `hosts` command below writes. http://localhost:${APP_PORT}
# always works and needs none of this.
orb_host="frontend.${COMPOSE_PROJECT_NAME}.orb.local"

# The address OrbStack currently gives that container; empty when it isn't running.
orb_ip() {
  dscacheutil -q host -a name "$orb_host" | awk '/^ip_address/ { print $2; exit }'
}

# The address /etc/hosts pins it to right now; empty when there is no entry.
hosts_ip() {
  awk -v host="$orb_host" '$1 !~ /^#/ { for (i = 2; i <= NF; i++) if ($i == host) { print $1; exit } }' /etc/hosts
}

# Rewrites /etc/hosts without any line naming $orb_host, plus the lines given on stdin.
replace_hosts_entry() {
  local tmp
  tmp="$(mktemp)"
  awk -v host="$orb_host" '{ keep = 1; for (i = 2; i <= NF; i++) if ($i == host) keep = 0 } keep' /etc/hosts >"$tmp"
  cat >>"$tmp"
  sudo cp -p /etc/hosts /etc/hosts.bak
  # tee writes in place, so the file keeps its owner and mode; the backup above covers a failed write.
  sudo tee /etc/hosts <"$tmp" >/dev/null
  rm -f "$tmp"
}

case "${1:-}" in
  up)
    docker compose up --detach --build --wait
    echo "ExpenseTracker is running at http://localhost:${APP_PORT:-80}"
    # Recreating a container can change its address, which silently staleys an existing entry.
    pinned="$(hosts_ip)"
    current="$(orb_ip)"
    if [ -n "$pinned" ] && [ -n "$current" ] && [ "$pinned" != "$current" ]; then
      echo "Note: /etc/hosts still points $orb_host at $pinned, but it is now $current." >&2
      echo "      Run: scripts/mac-app.sh hosts" >&2
    fi
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
  hosts)
    if [ "${2:-}" = "remove" ]; then
      if [ -z "$(hosts_ip)" ]; then
        echo "No /etc/hosts entry for $orb_host."
        exit 0
      fi
      replace_hosts_entry </dev/null
      echo "Removed $orb_host from /etc/hosts (backup: /etc/hosts.bak)."
      exit 0
    fi
    if [ -n "${2:-}" ]; then
      usage
      exit 2
    fi
    ip="$(orb_ip)"
    if [ -z "$ip" ]; then
      echo "Can't resolve $orb_host: is the frontend container running? Try scripts/mac-app.sh up." >&2
      exit 1
    fi
    printf '%s\t%s\n' "$ip" "$orb_host" | replace_hosts_entry
    echo "$orb_host now resolves to $ip (backup: /etc/hosts.bak)."
    echo "Re-run this after a rebuild that recreates the frontend container."
    ;;
  *)
    usage
    exit 2
    ;;
esac
