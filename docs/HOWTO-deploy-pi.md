# First deployment to the Raspberry Pi

The Pi builds its own arm64 images from a git checkout — there is no registry, and nothing is
cross-built on the Mac. This document is the first install, start to finish. Routine updates are two
commands and live at the bottom.

What you end up with, from `docker-compose.prod.yml` (project name `expense-tracker-prod`):

| Container | Published? | Notes |
|---|---|---|
| `frontend` | **yes**, `APP_PORT` → 80 | nginx serves the UI and proxies `/api` to the backend |
| `backend` | no | reachable only through nginx, on the compose network |
| `postgres` | no | data lives in the volume `expense-tracker-prod_pgdata` |

All three use `restart: unless-stopped`, so they come back after a reboot or a power cut.

> **The app has no login.** It is meant for your home network only. Do not port-forward it, and do not
> put it on a public hostname.

---

## 0. Prerequisites on the Pi

Work through these before cloning. Every one of them has bitten a first deploy.

**A 64-bit OS.** The images are arm64 only; a 32-bit userland cannot run them.

```bash
uname -m && getconf LONG_BIT
```

Expect `aarch64` and `64`. If you see `armv7l`, reinstall with 64-bit Raspberry Pi OS — nothing below
will work otherwise.

**Docker CE with the Compose v2 plugin.** Both Dockerfiles use `RUN --mount=type=cache`, which needs
BuildKit. Raspberry Pi OS's own `docker.io` + `docker-compose` (v1) packages are too old and will fail
the build with a syntax error on the first `RUN`. Install the official one:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"
```

Log out and back in, then check — the second command must print **v2.x**:

```bash
docker run --rm hello-world && docker compose version
```

**Disk.** The images, the build caches and the database want room. Check the root filesystem:

```bash
df -h /
```

Budget roughly 4–5 GB for images plus another 1–2 GB of Maven and npm build cache. Under ~10 GB free,
clear space first.

**Memory, if this is a 4 GB Pi.** The first build compiles the Spring backend *and* runs `tsc` plus the
bundler, both of which are memory-hungry. Raspberry Pi OS ships with a 200 MB swap file, which is not
enough headroom; an out-of-memory kill during the build shows up as a build that dies with no useful
error.

```bash
free -h
```

On 8 GB or more, carry on. On 4 GB, either raise swap to 2 GB:

```bash
sudo dphys-swapfile swapoff
sudo sed -i 's/^CONF_SWAPSIZE=.*/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile
sudo dphys-swapfile setup && sudo dphys-swapfile swapon
free -h
```

…or build the two services one at a time in step 3, which keeps the peak much lower.

`free -h` afterwards must actually show 2.0Gi of swap. If it still shows 200M, `CONF_MAXSWAP` in the
same file is capping it — it defaults to 2048, so it only gets in the way if you asked for more than
2 GB. Raise it alongside `CONF_SWAPSIZE` in that case.

**A deploy key for GitHub.** The repository is private, so the Pi needs its own SSH key:

```bash
ssh-keygen -t ed25519 -C "raspberry-pi" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Add that public key to the repository on GitHub (Settings → Deploy keys, read-only is enough), then
confirm:

```bash
ssh -T git@github.com
```

**A fixed address.** You will want to reach the app by something stable. Give the Pi a static DHCP
lease in your router. `raspberrypi.local` works from macOS and Safari, but Chromium browsers resolve
names with their own DNS client that never asks the OS and never speaks mDNS, so `.local` names fail
there with `ERR_NAME_NOT_RESOLVED` — the same trap documented for the Mac app. A plain IP, or a name in
your router's DNS, avoids it entirely.

---

## 1. Clone

```bash
git clone git@github.com:emung/expense-tracker.git ~/expense-tracker
cd ~/expense-tracker
```

---

## 2. Configure `.env`

```bash
cd ~/expense-tracker && cp .env.example .env
```

Edit it. Three values matter:

| Variable | Set it to | Why |
|---|---|---|
| `POSTGRES_PASSWORD` | something strong | **Required** — compose refuses to start without it |
| `APP_PORT` | `80` | the template defaults to `8080`, which is the dev value |
| `APP_CORS_ALLOWED_ORIGINS` | leave **empty** | only set this if a cross-origin client such as SmartBill will call this Pi |

Generate the password rather than inventing one, and lock the file down — it is the database password
in plain text:

```bash
cd ~/expense-tracker && openssl rand -base64 24 && chmod 600 .env
```

Sanity-check that compose reads the file before building anything. This validates the config and
prints the published port — it stops with the `POSTGRES_PASSWORD` error if `.env` is missing:

```bash
cd ~/expense-tracker && docker compose -f docker-compose.prod.yml config --format json | grep -o '"published": *"[0-9]*"'
```

Expect `"published": "80"`. Don't run plain `docker compose config` on a shared screen — it prints the
resolved database password.

---

## 3. Build and start

The first build is slow — plan for **20–40 minutes** on a Pi 5, most of it Maven downloading
dependencies and the frontend bundling. Later builds reuse both caches and take a few minutes.

On 8 GB or more, build and start in one go:

```bash
cd ~/expense-tracker && docker compose -f docker-compose.prod.yml up -d --build
```

On 4 GB (or if the one-shot build gets killed), do it in three steps so only one toolchain is resident
at a time:

```bash
cd ~/expense-tracker && docker compose -f docker-compose.prod.yml build backend
cd ~/expense-tracker && docker compose -f docker-compose.prod.yml build frontend
cd ~/expense-tracker && docker compose -f docker-compose.prod.yml up -d
```

Compose starts them in order and waits: Postgres until `pg_isready` passes, then the backend until its
readiness probe passes, then nginx. **The backend's first boot is the slow one** — it runs all Liquibase
changesets against an empty database. Its healthcheck allows 90 seconds of grace plus ten retries, so
about four minutes in total before compose gives up. If it does, go to step 4 and read the logs rather
than re-running the build.

---

## 4. Verify

**Containers and health** — all three `running`, frontend and backend `(healthy)`:

```bash
cd ~/expense-tracker && docker compose -f docker-compose.prod.yml ps
```

**The schema was created and seeded.** Six changesets, 13 categories, 2 accounts (SaltBank, Revolut):

```bash
cd ~/expense-tracker && docker compose -f docker-compose.prod.yml exec -T postgres \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select (select count(*) from databasechangelog) as changesets, (select count(*) from category) as categories, (select count(*) from account) as accounts"'
```

**nginx and the API answer, on the Pi itself:**

```bash
curl -fsS http://localhost/healthz && echo && curl -fsS http://localhost/api/categories | head -c 200
```

**The app loads from another machine.** Open `http://<pi-address>/` in a browser, add one expense, and
reload — it should still be there. That single round trip exercises nginx, the proxy, the backend and
Postgres at once.

If a write fails with **403 "Invalid CORS request"**, you set `APP_CORS_ALLOWED_ORIGINS` to something.
Empty it and restart the backend; see the CORS notes in `.claude/memories.md` for why the port in the
`Host` header matters.

**Survives a reboot.** Worth doing once, now, rather than discovering it during a power cut:

```bash
sudo reboot
# then, once it is back:
cd ~/expense-tracker && docker compose -f docker-compose.prod.yml ps
```

---

## 5. Set up backups — do this on day one

The Pi holds the only copy of your data, and it is on an SD card.

```bash
cd ~/expense-tracker && scripts/backup.sh
```

That writes `backups/expenses-<timestamp>.dump` (pg_dump custom format) and keeps the newest 30
(`KEEP=n` to change). **Verify the dump reads back** — a corrupt dump found at restore time is not a
backup:

```bash
cd ~/expense-tracker && docker run --rm -i postgres:17-alpine pg_restore --list < "$(ls -t backups/expenses-*.dump | head -1)" | tail -5
```

You should get a table of contents ending in indexes and foreign keys.

Then schedule it with `crontab -e`:

```
15 3 * * * cd /home/pi/expense-tracker && mkdir -p backups && scripts/backup.sh >> backups/backup.log 2>&1
```

The `mkdir -p` is not decoration: the shell creates `backup.log` *before* running the script, so without
it the very first run fails silently if `backups/` is missing.

**A backup on the same SD card as the database is not a backup.** Copy them off the Pi — for example,
from another machine:

```bash
rsync -av pi@<pi-address>:~/expense-tracker/backups/ ~/backups/expense-tracker-pi/
```

Check `backups/backup.log` occasionally. Cron failures are silent by design.

---

## 6. Day to day

**Update to a newer commit:**

```bash
cd ~/expense-tracker && scripts/backup.sh && git pull
cd ~/expense-tracker && docker compose -f docker-compose.prod.yml up -d --build
```

Back up *first* whenever the backend changed: rebuilding rolls code back, but it does not roll a
schema migration back — only a dump does. The reasoning, and the per-case detail, is in
[HOWTO-update-mac-app.md](HOWTO-update-mac-app.md); it is the same compose file and the same rules,
with `backups/mac/` reading `backups/` here.

**Status and logs:**

```bash
cd ~/expense-tracker && docker compose -f docker-compose.prod.yml ps
cd ~/expense-tracker && docker compose -f docker-compose.prod.yml logs -f backend
```

Logs are capped at 3 × 10 MB per container, so they cannot fill the card.

**Restore a dump** (this replaces current data):

```bash
cd ~/expense-tracker && docker compose -f docker-compose.prod.yml exec -T postgres \
  sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' \
  < backups/expenses-2026-09-12_031500.dump
cd ~/expense-tracker && docker compose -f docker-compose.prod.yml restart backend
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `unknown flag: --mount` or a parse error on the first `RUN` | Docker too old / no BuildKit | install Docker CE via `get.docker.com`, not `apt install docker.io` |
| `no matching manifest for linux/arm/v7` | 32-bit OS | reinstall 64-bit Raspberry Pi OS |
| Build dies with no error, or "Killed" | out of memory | raise swap, or build `backend` and `frontend` separately (step 3) |
| `POSTGRES_PASSWORD` error on `up` | `.env` missing or unset | `cp .env.example .env` and set it |
| `bind: address already in use` on :80 | something else serves port 80 | stop it, or set another `APP_PORT` |
| backend never becomes healthy | Liquibase or DB failure | `logs backend` — do not rebuild blindly |
| 403 "Invalid CORS request" on save | `APP_CORS_ALLOWED_ORIGINS` set | empty it, restart the backend |
| `ERR_NAME_NOT_RESOLVED` for `raspberrypi.local` in Chrome/Vivaldi/Edge | Chromium ignores mDNS | use the IP or a router DNS entry |

---

## What would destroy the data

Only the volume matters. Rebuilding images is safe; recreating the `postgres` *container* is safe too,
because the volume is re-attached.

These are the commands that do not spare it — none of them appear anywhere above:

```
docker compose -f docker-compose.prod.yml down -v
docker volume rm expense-tracker-prod_pgdata
docker system prune --volumes
```

Never run them on the Pi without a verified, off-Pi dump in hand.
