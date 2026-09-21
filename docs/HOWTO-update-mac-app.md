# Updating the Mac app without losing data

The app on this Mac (`scripts/mac-app.sh`, http://localhost:8090) holds **real expenses**. This is how
to move it to a newer commit safely.

## The one thing that matters

All data lives in the Docker volume **`expense-tracker-mac_pgdata`**. Nothing else is precious: the
images are rebuilt from git, and the containers are disposable.

So:

- **Rebuilding images is safe.** Recreating the `postgres` *container* is also safe — the volume is
  re-attached. Don't let "the database container was recreated" alarm you.
- **Only removing the volume loses data**, and only a handful of commands can do that. They are listed
  at the bottom. None of them appear anywhere in this document's update paths.
- **A schema migration is the one change you cannot undo by rebuilding.** Rolling the code back does
  not roll the schema back; only a dump does. That is why the backup step below is mandatory whenever
  the backend changes.

## 0. Which case are you in?

Compare what you are about to deploy against what is deployed now:

```bash
cd ~/dev/repos/private/expense-tracker && git fetch && git diff --stat @{u} -- backend/ frontend/
```

- Only `frontend/` lines → **Case A** (UI only)
- Only `backend/` lines → **Case B**
- Both → **Case C**

Also check whether a migration is involved, because that decides how careful to be:

```bash
cd ~/dev/repos/private/expense-tracker && git diff --name-only @{u} -- backend/src/main/resources/db/changelog/
```

Empty output means no new changeset, so the backend upgrade is pure code and is reversible by
rebuilding the old commit.

> **Knowing what is deployed.** Nothing stamps the running images with a commit, so `@{u}` above only
> works if you deploy straight after pulling. A cheap convention that removes the guesswork: move a
> tag every time you deploy, with `git tag -f mac-deployed && git push -f origin mac-deployed` (or
> keep it local), and then diff against `mac-deployed..HEAD`. The exact schema level is always
> knowable, though — see the `databasechangelog` query in step 4.

## 1. Back up first

Always for Case B and C. For Case A it is optional, but it costs seconds:

```bash
cd ~/dev/repos/private/expense-tracker && scripts/mac-app.sh backup
```

Then **verify the dump is readable** — a corrupt dump discovered at restore time is not a backup.
There is no `pg_restore` on this Mac, so borrow the one in the Postgres image:

```bash
cd ~/dev/repos/private/expense-tracker && docker run --rm -i postgres:17-alpine pg_restore --list < "$(ls -t backups/mac/expenses-*.dump | head -1)" | tail -5
```

It should print a table of contents ending in the indexes and foreign keys. An error or empty output
means the dump is unusable — stop and find out why before updating anything.

(If you ever `brew install libpq`, `pg_restore --list <file>` works directly.)

`backups/mac/` is git-ignored and sits on the same disk as the database, so for anything you would
hate to lose, copy the dump off the Mac as well.

## 2. Pull

```bash
cd ~/dev/repos/private/expense-tracker && git pull --ff-only
```

## 3. Update

### The simple answer for all three cases

```bash
cd ~/dev/repos/private/expense-tracker && scripts/mac-app.sh up
```

`up` runs `docker compose up --detach --build --wait`, which rebuilds both images and **recreates only
the containers whose image actually changed**. An unchanged image is a full layer-cache hit, so the
service it belongs to is left running and untouched. That means this one command already behaves
correctly in every case below — the cases differ in what it *does*, not in what you type.

Use the targeted commands only when you want to skip the other image's build entirely (a minute or so
on the backend). They need the same environment `mac-app.sh` sets up, because Compose interpolates the
whole file and `POSTGRES_PASSWORD` is required even when you only touch the frontend:

```bash
cd ~/dev/repos/private/expense-tracker && set -a && . ./.env.mac && set +a && export COMPOSE_PROJECT_NAME=expense-tracker-mac COMPOSE_FILE=docker-compose.prod.yml
```

Run that in the shell first, then the per-case command below in the *same* shell.

### Case A — UI changed only

Nothing touches the database. The frontend image is a static Vite build served by nginx; only that
container restarts, and the API keeps serving throughout.

```bash
docker compose up -d --build --no-deps --wait frontend
```

Afterwards, **hard-reload the browser** (⌘⇧R). `index.html` is sent with `Cache-Control: no-cache` and
the assets are content-hashed, so a normal reload is usually enough — but a hard reload removes the
question entirely.

### Case B — backend changed only

The backend container is replaced and **Liquibase runs on startup**, applying any new changeset to the
real database. This is the case that needs the verified backup from step 1.

`--no-deps` guarantees Compose does not touch `postgres` at all:

```bash
docker compose up -d --build --no-deps --wait backend
```

The frontend is left running and needs no rebuild: nginx resolves `backend` through Docker's embedded
DNS with `valid=10s` (`frontend/nginx/default.conf`), so it picks up the new container's address on
its own. That is deliberate — it is why a backend-only update causes no frontend downtime.

If `--wait` times out, the backend did not become healthy. Go to *Rollback* below; do not leave it
looping.

### Case C — both changed

Do them in this order, so the API is already serving the new contract when the new UI appears:

```bash
docker compose up -d --build --no-deps --wait backend
```

```bash
docker compose up -d --build --no-deps --wait frontend
```

Or simply `scripts/mac-app.sh up`, which does the same thing in dependency order.

## 4. Verify

```bash
cd ~/dev/repos/private/expense-tracker && scripts/mac-app.sh status
```

All three services should read `(healthy)`. Then check the data survived and the schema is where you
expect:

```bash
cd ~/dev/repos/private/expense-tracker && set -a && . ./.env.mac && set +a && COMPOSE_PROJECT_NAME=expense-tracker-mac docker compose -f docker-compose.prod.yml exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select count(*) as expenses from expense;" -c "select id, dateexecuted from databasechangelog order by orderexecuted desc limit 3;"
```

The expense count must not have dropped, and the newest `databasechangelog` row should be the
changeset you expected (or the same one as before, if this was a UI-only update).

Finally open http://localhost:8090 and confirm the change is actually there.

If you use the `frontend.expense-tracker-mac.orb.local` name in a Chromium browser, re-pin it after any
update that recreated the frontend container, because its address changes:

```bash
cd ~/dev/repos/private/expense-tracker && scripts/mac-app.sh hosts
```

`scripts/mac-app.sh up` warns you when the pinned entry has gone stale. `http://localhost:8090` is
never affected.

## 5. Rollback

**No new changeset was applied** (the common case) — rebuild the previous commit:

```bash
cd ~/dev/repos/private/expense-tracker && git checkout <previous-sha> && scripts/mac-app.sh up
```

**A changeset was applied** — the code rollback alone leaves the schema ahead of the code. Restore the
dump you took in step 1, which replaces the current contents of the database:

```bash
cd ~/dev/repos/private/expense-tracker && set -a && . ./.env.mac && set +a && COMPOSE_PROJECT_NAME=expense-tracker-mac docker compose -f docker-compose.prod.yml exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < backups/mac/expenses-<timestamp>.dump
```

```bash
cd ~/dev/repos/private/expense-tracker && git checkout <previous-sha> && scripts/mac-app.sh up
```

Every changeset in this repo carries an explicit `rollback` block, so a Liquibase rollback is possible
in principle — but no Liquibase CLI is wired into this project, so the dump is the practical path.

## Never run these against the Mac app

Each one destroys `expense-tracker-mac_pgdata` — or can:

| Command | Why |
|---|---|
| `docker compose down -v` / `--volumes` | Deletes the named volume. `scripts/mac-app.sh down` is the safe stop; it never passes `-v`. |
| `docker volume rm expense-tracker-mac_pgdata` | Deletes it outright. |
| `docker system prune --volumes` / `-a --volumes` | Sweeps unused volumes; one stopped stack away from taking this one. |
| OrbStack / Docker Desktop "reset to factory defaults" | Removes every volume on the machine. |

`scripts/mac-app.sh down`, `restart`, `up`, and everything in this document are safe.

## Two traps

- **Changing `POSTGRES_PASSWORD` in `.env.mac` does not change the database password.** Postgres only
  applies it when the volume is first created, so editing it later just makes the backend fail to
  authenticate against data that is still perfectly fine. Put the original value back.
- **The dev stack is a different app.** `docker-compose.yml` (project `expense-tracker`, volume
  `expense-tracker_pgdata`, port 8080/5173/5432) is throwaway development data. The commands here all
  pin `COMPOSE_PROJECT_NAME=expense-tracker-mac` and `COMPOSE_FILE=docker-compose.prod.yml`
  specifically so the two never get confused. If you run a bare `docker compose` in this repo without
  that environment, you are talking to the dev stack.
