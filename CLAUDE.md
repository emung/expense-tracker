@.claude/memories.md

# Expense Tracker

A self-hosted, single-user expense tracker that replaces an Apple Numbers spreadsheet. See `README.md` for how to run it.

- `backend/`: Spring Boot 4 (Java 25, Maven wrapper), Liquibase YAML changelogs, PostgreSQL 17. Base package `dev.emung.expensetracker`, organized by feature (`category`, `account`, `expense`, `report`, `common`).
- `frontend/`: React + Vite + TypeScript, Mantine, TanStack Query, Recharts. The UI is in Romanian.
- `docker-compose.yml` is for dev (postgres always runs; `--profile app` adds backend and frontend). `docker-compose.prod.yml` is for the Raspberry Pi and builds the images there.

## Conventions
- Run Maven only through `./mvnw` from `backend/`. Never bypass `.mvn/settings.xml` (see memories).
- Schema changes go in new Liquibase changesets only. Never edit a changeset that has already been applied.
- Money is `numeric(12,2)` / `BigDecimal` with HALF_UP rounding. The server computes `amount_ron`.
- Commiting on main is allowed in this repository
- Commit messages: no Co-Authored-By trailers.
- Modify the ROADMAP.md after a milestone / feature is complete so I know what is already done and what is not done yet
- Do not start any dev server until you got my permission
- Do not run any database migration until you got my permission
