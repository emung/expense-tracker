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
- Modify the ROADMAP.md after a milestone / feature is complete so I know what is already done and what is not done yet
- Do not start any dev server until you got my permission
- Do not run any database migration until you got my permission
- Everytime something is unclear - ASK!

## Git Workflow
- Working directly on the `main` branch is expected for this project — no feature branches needed.
- Never run `git commit` or `git push` yourself. Implement and stage changes, then stop and wait for my explicit approval before committing.
- Once an implementation is complete, propose one concise commit message (Conventional Commits style, e.g. `fix: handle null pointer in OrderService`) so I can commit it myself.
- Never force-push or rewrite history on `main`.
- Do not add `Co-Authored-By` trailers (or any Claude/Anthropic attribution or generated-by footers) to commit messages.
- When drafting a PR/MR description, do not include `Co-Authored-By` trailers or Claude attribution there either.
