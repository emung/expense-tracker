# expense-tracker

A self-hosted, single-user tracker for personal expenses. It replaces a spreadsheet kept in Apple Numbers and has a Romanian UI.

- **Quick entry.** The Suma field accepts formulas like `-88,74+38.99`. Enter saves and keeps the date, account and currency for the next receipt.
- **Keyboard shortcuts.** `n` jumps to a new entry and `/` to the search box, `g c` / `g r` / `g s` move between the pages, and Ctrl/⌘+Enter saves even out of an open dropdown. `?` shows the whole list.
- **EUR entries.** You enter a manual exchange rate, and the lei amount is computed on the server.
- **Refunds and cashback.** They're recorded as *Retur* entries on any category and reduce that category's net spend.
- **Monthly report.** It shows net spend per category: summary tiles, a bar chart, and a table with percentages.
- **Settings.** Manage categories and accounts. Anything already used by expenses is archived instead of deleted.

Planned work is in [docs/ROADMAP.md](docs/ROADMAP.md): bank-statement import, recurring expenses, monthly budgets and automatic BNR rates.

| Layer | Stack |
|---|---|
| Backend | Spring Boot 4 (Java 25), Maven wrapper, Spring Data JPA, Liquibase, PostgreSQL 17 |
| Frontend | React 19, Vite, TypeScript, Mantine, TanStack Query, React Router, Recharts |
| Runtime | Docker Compose: native builds on an Apple Silicon Mac (dev) and a Raspberry Pi 5 (prod) |

```
backend/                  REST API under /api, Liquibase changelogs in src/main/resources/db/changelog
frontend/                 single-page app; nginx serves it and proxies /api in Docker
docker-compose.yml        development (Postgres; add --profile app for the full stack)
docker-compose.prod.yml   production on the Pi (builds images on the host)
scripts/backup.sh         pg_dump backups with retention
docs/ROADMAP.md           planned v2 features and their sequencing
```

## Development

Prerequisites: Docker (OrbStack or Docker Desktop), a JDK 25 or newer, and Node 24 (see `frontend/.nvmrc`).

```bash
cp .env.example .env
docker compose up -d                         # Postgres on 127.0.0.1:5432
(cd backend && ./mvnw spring-boot:run)       # API on http://localhost:8080
(cd frontend && npm ci && npm run dev)       # UI on http://localhost:5173 (proxies /api to 8080)
```

Liquibase creates the schema on startup and seeds the categories and accounts from the original spreadsheet.

### Running from IntelliJ IDEA

The shared run configurations in `.run/` are picked up automatically:

| Configuration | What it does |
|---|---|
| **Full stack (dev)** | Starts the backend and the frontend together |
| **Backend (Spring Boot)** | Starts Postgres first (and waits until it's healthy), then the API on :8080; can also be started with Debug |
| **Frontend (Vite)** | `npm run dev` in `frontend/`, served on http://localhost:5173 |
| **Postgres (Docker)** | `scripts/dev-postgres.sh`: `docker compose up -d --wait postgres` |

One-time IDE setup:

1. Import the backend: right-click `backend/pom.xml` → *Add as Maven Project*. The module is named `expense-tracker-backend`.
2. Apply the Maven overrides described under *Registry isolation* below.
3. Under *Settings → Languages & Frameworks → Node.js*, select Node 24 (IntelliJ lists the nvm versions), and run `npm ci` in `frontend/` once.

### Tests

```bash
(cd backend && ./mvnw verify)                # unit + WebMvc tests, then Testcontainers ITs (needs Docker)
(cd frontend && npm test && npm run typecheck)
```

Frontend tests run on jsdom with React Testing Library; both `src/**/*.test.ts` and `.test.tsx` are picked up.


### Registry isolation

This project never uses user-level package registries, such as work repositories configured on the machine.

- **Maven:** `backend/.mvn/maven.config` replaces both the user settings (`~/.m2/settings.xml`) and the global Maven settings with `backend/.mvn/settings.xml`. That file routes every repository to Maven Central and uses its own local cache, `~/.m2/repository-expense-tracker`. Always run `./mvnw` from `backend/`. To check: `./mvnw help:effective-settings`.
- **npm:** `frontend/.npmrc` pins `https://registry.npmjs.org/` and exact versions.
- **IntelliJ IDEA:** under *Settings → Build Tools → Maven*, override *User settings file* with `backend/.mvn/settings.xml` and *Local repository* with `~/.m2/repository-expense-tracker`. Otherwise the IDE's own Maven import still reads `~/.m2/settings.xml`.

## Full stack in Docker (local)

```bash
docker compose --profile app up --build      # http://localhost:8080 (APP_PORT in .env)
```

Stop the natively running backend first, or set `APP_PORT` to another port, because both use 8080 by default.

## Running the app on your Mac (day to day)

This mode is for actually tracking expenses on the Mac. It uses built images, like on the Pi, and a separate database (volume `expense-tracker-mac_pgdata`), so development test data never mixes with real entries.

One-time setup:

```bash
cp .env.mac.example .env.mac    # set POSTGRES_PASSWORD, e.g. openssl rand -base64 24
```

Everyday commands (IntelliJ has the same as *App on Mac (Docker)* and *App on Mac: stop*):

```bash
scripts/mac-app.sh up           # build what changed, start, wait until healthy -> http://localhost:8090
scripts/mac-app.sh status       # containers and health
scripts/mac-app.sh logs backend # follow logs
scripts/mac-app.sh backup       # dump to backups/mac/
scripts/mac-app.sh hosts        # pin frontend.expense-tracker-mac.orb.local in /etc/hosts (sudo)
scripts/mac-app.sh down         # stop (data is kept)
```

- **Starting with the Mac:** the containers use `restart: unless-stopped`, so they come back whenever Docker starts. Enable "start at login" in OrbStack or Docker Desktop.
- **Updating:** `git pull && scripts/mac-app.sh up`. This database holds real entries, so [docs/HOWTO-update-mac-app.md](docs/HOWTO-update-mac-app.md) covers it properly: when to back up, what changes for UI-only, backend-only and both, how to verify, how to roll back, and which commands would destroy the volume.
- **Ports:** development keeps 8080 (API), 5173 (Vite) and 5432 (dev Postgres); this app's Postgres isn't published at all.
- **The `.orb.local` name and Chromium browsers:** OrbStack publishes `frontend.expense-tracker-mac.orb.local` over mDNS only. macOS, `curl` and Safari resolve it; Chrome, Vivaldi and Edge use their own DNS client, which never asks macOS, so there it fails with `ERR_NAME_NOT_RESOLVED` however you set "Secure DNS". `scripts/mac-app.sh hosts` pins the name to the container's current address in `/etc/hosts`, which both resolvers read (`hosts remove` undoes it); re-run it after a rebuild that recreates the frontend, since the address changes. `http://localhost:8090` needs none of this, and so does any `*.localhost` name, e.g. `http://expenses.localhost:8090`.
- **Wiping this app's data is irreversible:** `scripts/mac-app.sh down && docker volume rm expense-tracker-mac_pgdata`.

## Deploying to the Raspberry Pi

The Pi builds the arm64 images itself from a git checkout, so no container registry is needed.

One-time setup, with Docker and the Compose plugin installed on the Pi:

```bash
git clone git@github.com:emung/expense-tracker.git ~/expense-tracker
cd ~/expense-tracker
cp .env.example .env    # set a strong POSTGRES_PASSWORD, and APP_PORT=80
docker compose -f docker-compose.prod.yml up -d --build
```

Updating:

```bash
cd ~/expense-tracker && git pull
docker compose -f docker-compose.prod.yml up -d --build
```

- The first build takes a while on the Pi. Later builds reuse the cached Maven and npm dependencies.
- Containers restart automatically after a reboot (`restart: unless-stopped`).
- The app is only meant for your home network. It has no login, so don't expose it to the internet.
- Only the web port is published. Postgres and the API are reachable only through nginx.

Check status and logs:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

## Backups and restore

The Pi holds the only copy of the data, so schedule backups:

```bash
scripts/backup.sh                            # writes backups/expenses-<timestamp>.dump, keeps the newest 30 (KEEP=n)
crontab -e                                   # 15 3 * * * cd /home/pi/expense-tracker && scripts/backup.sh >> backups/backup.log 2>&1
```

Copy `backups/` off the Pi regularly, for example with `rsync` to another machine.

To restore a dump, which replaces the current data:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' \
  < backups/expenses-2026-09-12_031500.dump
docker compose -f docker-compose.prod.yml restart backend
```

## Configuration

Set these in `.env` (see `.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `POSTGRES_DB` / `POSTGRES_USER` | `expenses` | Database name and user |
| `POSTGRES_PASSWORD` | `change-me` in dev; **required** in prod | Database password |
| `POSTGRES_PORT` | `5432` | Dev only: host port bound to 127.0.0.1 |
| `APP_PORT` | `8080` dev / `80` prod | Host port of the web app |
| `TZ` | `Europe/Bucharest` | Container time zone |
