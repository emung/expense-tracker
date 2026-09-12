# Project memories

## Maven must never use the work registries
The user-level `~/.m2/settings.xml` has a work profile (`prolion`) that is active by default and adds private Nexus repositories. This project must never resolve anything from them.
- `backend/.mvn/maven.config` passes `--settings` and `--global-settings`, both set to `.mvn/settings.xml`. That replaces both `~/.m2/settings.xml` and the Maven installation's `conf/settings.xml`, so neither is ever read.
- `backend/.mvn/settings.xml` uses a separate local repo (`~/.m2/repository-expense-tracker`) and one mirror, `mirrorOf *`, pointing to Maven Central.
- `pom.xml` declares no `<repositories>` or `<pluginRepositories>`.
- In IntelliJ, override the Maven "User settings file" and "Local repository" with the values above.
- To check: `./mvnw help:effective-settings` should not mention prolion.
- **The same rule applies to npm.** `~/.npmrc` has a commented-out prolion registry line. `frontend/.npmrc` pins `registry=https://registry.npmjs.org/` so this project stays on the public registry even if that line is uncommented. After installing, `grep -c prolion frontend/package-lock.json` should print 0.

## Product decisions (v1)
- The app is based on the user's Numbers sheet: one table per payment source (SaltBank, Revolut, EUR), with columns Data | Magazin | Categorie | Suma | Detalii and 13 categories.
- No auth (LAN only). No import of historical data.
- Currency is per expense (RON or EUR). EUR entries need a manually entered rate, and the server stores `amount_ron`.
- Refunds and cashback are `entry_type = REFUND` on any category and reduce that category's net. There is no "Retur" category.
- Amounts are always positive in the DB. The UI accepts arithmetic expressions such as `-88,74+38.99` and stores the absolute value.
- No tags or trips in v1. The only report is monthly spend by category.
- The report chart is a **horizontal bar chart with a single color** (one series, 13 unordered categories) plus a table showing amount and %. There's no donut (13 segments is an anti-pattern) and no per-category colors, so the `category` table has no color column. This follows the dataviz guidance.
- UI in Romanian. Dates shown as dd.MM.yyyy, amounts as `1.568,14 lei`.

## Backend conventions (Spring Boot 4)
- In Boot 4 the test annotations moved into separate modules:
  - `org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest`
  - `org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase`
  - `org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest`
  - `@MockitoBean` comes from spring-test.
- Use `MockMvcTester` (AssertJ style). Jackson is version 3 (`tools.jackson`).
- Testcontainers 2.x: `org.testcontainers.postgresql.PostgreSQLContainer` (not generic). It's shared through `TestcontainersConfiguration` with `@ServiceConnection`.
- Test naming: `*Test` for unit and WebMvc tests (surefire), `*IT` for Testcontainers tests (failsafe). `./mvnw verify` runs both.
- Timestamps are set by `BaseEntity` using `@PrePersist`/`@PreUpdate`. `char(3)` enum columns use `@JdbcTypeCode(SqlTypes.CHAR)`.
- Errors are ProblemDetail responses from `GlobalExceptionHandler`. Services throw `NotFoundException` (404), `ConflictException` (409) or `BusinessRuleException` (400, optionally tied to a field). Messages are in Romanian and shown to the user.
- Categories and accounts that are still referenced can't be deleted (409); archive them instead. `Text.countLabel` produces Romanian plurals ("20 de cheltuieli").

## Frontend conventions (Mantine 9, React Router 8, TypeScript 7)
- **Mantine 9 changes:**
  - `Grid` uses `gap`, not `gutter`.
  - Date inputs work with `YYYY-MM-DD` strings. `dayjs` `customParseFormat` is extended in `main.tsx`, and `lib/dateInput.ts` parses `dd.MM.yyyy`.
  - Searchable Selects use `selectFirstOptionOnChange` and `autoSelectOnBlur` so a category can be picked from the keyboard.
- **Forms:** `ExpenseForm` saves on Enter through its own `onKeyDown` → `requestSubmit()`. Server field errors are mapped to form fields (`originalAmount` → `amount`, `fxRate` → `rate`).
- **Testing Enter in the Browser pane:** the automated `key Return` arrives with `event.key === ""`, so it can't exercise Enter-to-save. Use a synthetic `KeyboardEvent` through `javascript_tool` instead.
- **URL state:** filters live in Romanian query parameters (`luna`, `categorie`, `cont`, `tip`, `q`, `pagina`, `sort`).
- **Report route:** it's lazy-loaded, keeping Recharts out of the initial bundle.
- **Chart colors** follow the dataviz reference palette: a single validated blue for light and dark via `useComputedColorScheme`, and no per-category colors.

## Docker and deployment (verified on the Mac)
- **Backend image:** built with `./mvnw` inside Temurin 25, so the Maven isolation also applies in Docker. It runs as the non-root user `app`, using layered Boot jars.
- **Frontend image:**
  - Built on `node:24-slim`: the TS 7 native compiler and rolldown need glibc.
  - Served by `nginx:stable-alpine`, which proxies `/api` to `backend:8080` through Docker DNS (`resolver 127.0.0.11`), so backend restarts don't leave a stale IP.
- **Dev compose:** `docker compose --profile app up --build` starts the full stack. Use `APP_PORT=8088` while the native backend holds port 8080.
- **Prod compose** (`docker-compose.prod.yml`):
  - The project name `expense-tracker-prod` gives it a volume separate from dev.
  - `POSTGRES_PASSWORD` is required.
  - Only the web port is published.
  - It was tested on the Mac as a fresh install: healthy stack, 5 changesets, seeded data.
- **Backups:** `scripts/backup.sh` writes `pg_dump` custom-format dumps into the git-ignored `backups/`, keeps `KEEP` dumps (default 30), and its output was checked with `pg_restore --list`.

## Infrastructure decisions
- Git remote: GitHub (`emung/expense-tracker`). There is no container registry.
- The Pi 5 builds the images itself: `git pull && docker compose -f docker-compose.prod.yml up -d --build`.
- Local Docker runtime is OrbStack (Docker 29), so use Testcontainers 2.x.
- Only JDK 26 is installed locally; the project targets `--release 25` and the Docker images use Temurin 25.
