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

## IntelliJ run configurations
- The user runs IntelliJ IDEA 2026.2 **Ultimate** (Spring and Node.js plugins included). Shared run configurations live in `.run/*.run.xml`, since `.idea/` is git-ignored:
  - `Backend (Spring Boot)` points at the module `expense-tracker-backend` and runs `Postgres (Docker)` before launch.
  - `Frontend (Vite)` is an npm configuration using the project Node interpreter.
  - `Full stack (dev)` is a compound of those two.
- The backend's Maven artifactId is `expense-tracker-backend` so its module name doesn't clash with the IDE root module `expense-tracker`. The jar is still `target/app.jar` (`finalName`).
- `scripts/dev-postgres.sh` adds the Docker CLI locations to `PATH` itself, because an IDE launched from the Dock doesn't inherit the shell PATH. nvm is initialised only in `~/.zshrc`.
- The user's IDE already overrides Maven's user settings file and local repository, as described in the registry isolation section.

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

## Day-to-day app on the Mac
- The user wanted the app fully containerized on the Mac for **real use**, not for development, with a **separate database**.
- `scripts/mac-app.sh up|down|restart|status|logs|backup` reuses `docker-compose.prod.yml` as the project `expense-tracker-mac` (volume `expense-tracker-mac_pgdata`).
- It exports the values from the git-ignored `.env.mac` (template `.env.mac.example`, default `APP_PORT=8090`). Exported values override the dev `.env`, which Compose would otherwise read.
- Backups go to `backups/mac/` through `BACKUP_DIR`.
- IntelliJ has *App on Mac (Docker)* and *App on Mac: stop*.
- Never run `down -v` or remove that volume without asking: it holds real data.
- **`*.orb.local` does not resolve in Chromium browsers.** OrbStack publishes `frontend.expense-tracker-mac.orb.local` over mDNS only: macOS, `curl` and Safari find it, `dig` against any nameserver does not, and Chrome/Vivaldi/Edge resolve with their own DNS client that never asks macOS and never speaks mDNS - so they fail with `ERR_NAME_NOT_RESOLVED` whatever "Secure DNS" is set to, and `chrome://flags/#enable-async-dns` no longer exists to turn that off. Diagnosed 2026-09-21; the containers were healthy the whole time.
  - `scripts/mac-app.sh hosts` writes the current container address into `/etc/hosts` (the one place both resolvers look), `hosts remove` drops it, and `up` warns when an existing entry has gone stale. Recreating the container changes the address, so the entry needs refreshing then.
  - `http://localhost:8090` (the published port) and any `*.localhost` name, e.g. `http://expenses.localhost:8090`, avoid name resolution entirely and can't break this way.

## Cross-origin API access (for SmartBill)
- The backend had **no CORS config and no auth**: the frontend only works because nginx
  proxies `/api` same-origin, and prod compose publishes only the nginx port.
- `common/web/CorsConfig.java` (the project's first `@Configuration`) opens `/api/**` to the
  origins in `app.cors.allowed-origins` / `APP_CORS_ALLOWED_ORIGINS`, **empty by default** so
  CORS stays off unless switched on. `allowCredentials(false)`, never `*` with credentials.
- Wired through both compose files (backend service only) and both `.env*.example` files.
- The consumer is `~/dev/repos/private/smartbills`, a bill-scanning PWA that OCRs a receipt
  and POSTs an `ExpenseRequest`. It reads `/api/categories`, `/api/accounts` and
  `/api/merchant-rules?q=` to fill in the ids, so the merchant rules this app already learns
  also drive SmartBill's category/account pre-fill.

### The trap it sprang: nginx must forward the port in `Host`
Switching CORS on made **every same-origin write 403** ("Invalid CORS request"), because
browsers send `Origin` on POST/PUT/DELETE even same-origin, and Spring's
`CorsUtils.isCorsRequest` compares scheme + host + **port** against it. nginx was sending
`proxy_set_header Host $host`, and `$host` strips the port, so the backend thought it was
`http://localhost` while the browser said `http://localhost:8090` - cross-origin, not listed,
rejected. Fixed with `Host $http_host`. GET hid the bug (no `Origin` on same-origin GETs), and
so did an empty `APP_CORS_ALLOWED_ORIGINS` (no mapping, nothing to reject) - it only bites a
deployment that has actually switched CORS on, like `.env.mac`.
- Preflight-only tests miss this entirely. `CorsConfigTest` now also sends a plain `DELETE`
  with an `Origin`, same-origin and cross-origin.
- Still latent for TLS: `request.getScheme()` is `http` behind nginx, so an `https://` origin
  would mismatch again. `server.forward-headers-strategy: framework` would fix that when the
  time comes (nginx already sends `X-Forwarded-Proto`).

## Infrastructure decisions
- Git remote: GitHub (`emung/expense-tracker`). There is no container registry.
- The Pi 5 builds the images itself: `git pull && docker compose -f docker-compose.prod.yml up -d --build`.
- Local Docker runtime is OrbStack (Docker 29), so use Testcontainers 2.x.
- Only JDK 26 is installed locally; the project targets `--release 25` and the Docker images use Temurin 25.

## v2 roadmap decisions
The plan for v2 lives in `docs/ROADMAP.md` (committed). Decisions taken with the user:
- **Bank import targets SaltBank CSV only.** PDF statements are deferred; Revolut is never imported (1–2 entries/month, typed by hand).
- **Budgets are a fixed monthly plan per category**, not a rolling average. Store them versioned by effective month (`category_budget(category_id, valid_from, amount_ron)`), never as a column on `category`, so changing a target doesn't rewrite past reports.
- **Capture friction comes first** (v2.0): merchant rules → keyboard shortcuts → undo delete → recurring expenses → CSV import → CSV export. Merchant rules must land before the importer, because they are what pre-categorizes imported rows.
- **Recurring expenses are propose-and-confirm, computed at query time** (`NOT EXISTS` against `expense` for that month), not a scheduled insert. Catch-up-safe on a Pi that reboots.
- **Transfers get their own table, not a third `EntryType`.** `TRANSFER` in the enum would break `ck_expense_entry_type` and would silently enter every `SUM(...) FILTER (WHERE entry_type = 'EXPENSE')` in the report and totals.
- **Explicitly out of scope:** auth/multi-user, Envers/audit tables, Redis or Spring Cache, event sourcing, a mobile app, and receipt OCR.

Two traps recorded while planning: nginx caps request bodies at 1 MB (`frontend/nginx/default.conf`), so a CSV upload 413s at the proxy before Spring sees it; and `vite.config.ts` includes only `src/**/*.test.ts`, so `.tsx` component tests are excluded by configuration and none exist.

## Merchant rules (A1, shipped)
`merchant_rule` (changeset 006) maps a merchant to a category + optional account, so the second entry for a shop is merchant + amount only. It is also what will pre-categorise imported CSV rows.
- **Learned on every expense save** in `ExpenseService.apply` via `MerchantRuleService.learn`. An unpinned rule follows the latest entry; **editing a rule in Setări pins it** (`pinned = true`) and later entries then only increment `hit_count`. Without pinning the settings screen would be pointless, since the next save would revert every edit.
- `MerchantQueryRepository.suggest` LEFT JOINs the rule and prefers it over the most recent expense, falling back when the rule's category or account is archived. `MerchantSuggestion` also carries `lastAmountRon` (shown in the dropdown, never pre-filled) and `fromRule`.
- FKs are deliberate: category `ON DELETE CASCADE` (a rule is derived data and must never block deleting a category), account `ON DELETE SET NULL` (losing the account only clears the hint).

### Three traps this hit — check these in any similar work
1. **`where :query is null or ... like lower(concat('%', :query, '%'))` fails on Postgres** when the parameter is null: it goes untyped, Postgres resolves `||` as `bytea`, and `lower(bytea) does not exist` → 500. It can pass in tests and fail at runtime, because a plan cached on the connection from an earlier non-null call hides it. Use **two derived queries** instead (`findByOrderBy...` / `findByMerchantKeyContainingIgnoreCaseOrderBy...`), with `@EntityGraph` for the fetch joins. `Containing` also escapes LIKE wildcards for free.
2. **JPA writes are invisible to the native queries in the same transaction until flushed.** `learn` uses `saveAndFlush` so the JdbcClient merchant-suggestion query sees the rule it just changed. Watch for this anywhere JdbcClient reads meet JPA writes.
3. **Tests that poke the DB with raw SQL are invisible to the JPA first-level cache.** Pin a rule by calling `MerchantRuleService.update`, not `UPDATE merchant_rule SET pinned = true`.

Also: the 13 seeded categories have **no "Mancare"** — groceries are `Consumabile`. See `004-seed-categories.yaml` before inventing names in tests.

## Keyboard shortcuts and the frontend test setup (A2, shipped)
`useAppHotkeys` (called once from `AppLayout`) binds `n`, `/`, `g c|r|s`, `?` through Mantine's `useHotkeys`.
- **The `g …` sequences are a timestamp window, not a second listener.** `g` stamps a ref; `c`/`r`/`s` navigate only if that stamp is younger than 1.2 s. Mantine's hook can't express sequences, and a second document listener would have needed its own tag guard.
- Every handler is wrapped in `unlessModalOpen`, because Mantine's `tagsToIgnore` only protects fields: without it, `n` typed inside a modal would act on the page behind it. It looks for `[aria-modal="true"]`.
- Focus targets are marked with `hotkeyTarget('merchant' | 'search')` and found with `focusHotkeyTarget`, so the layout doesn't need refs into pages it doesn't own. **When the field is on another page, the focus request has to wait for `pathname` to reach the destination** - navigation is a transition, so the commit that sets the request happens before the page renders.
- `paths` moved from `router.tsx` to `lib/paths.ts`; otherwise router → AppLayout → hook → router is a cycle.
- **Ctrl/⌘+Enter defers `requestSubmit` by a tick** (`setTimeout(…, 0)`). That keystroke first lets an open dropdown pick its highlighted option, and the deferred submit then reads a form state that already has it. Plain Enter still bails on `defaultPrevented`, so it never fights a dropdown.

`SearchableSelect` wraps the searchable `Select` and **selects the label on focus**. Tabbing into an input already selects its text natively - the bug only shows when focus arrives another way (a click, or a shortcut), where Mantine parks the caret after the label and typing produces `ConsumabileCas`. Used by `ExpenseForm`, `ExpenseFiltersBar` and `MerchantRulesSection`.

Tests now run on jsdom with React Testing Library (E4, pulled forward): `vite.config.ts` includes `.test.tsx`, and `src/test/setup.ts` stubs `matchMedia`, `ResizeObserver` and `scrollIntoView`, which Mantine needs. `src/test/render.tsx` renders inside MantineProvider + QueryClientProvider and returns a `userEvent` session.

### Traps found while writing these tests
1. **A Mantine dropdown's options are invisible to role queries in jsdom.** Floating UI can't measure anything, so the open dropdown keeps `display: none` and its options are out of the accessibility tree - query them with `{ hidden: true }`.
2. **`getByLabelText` on a `Select` matches two elements**, the input and the listbox (`aria-labelledby` points at the same label). Use `getByRole('combobox', { name })`.
3. **The non-searchable `Select` is still an `<input>`**, not a button, so "target is an HTMLInputElement" does not separate text fields from pickers. What separates them is that the combobox calls `preventDefault` on Enter.
4. **In the Browser pane, a hidden pane throttles `requestAnimationFrame`**, which freezes Mantine transitions: a modal opened by a shortcut looks like it never opened. Take a screenshot (or poll for seconds) before concluding anything about modals there.

## Undo on delete (A3, shipped)
Deleting an expense shows an 8-second offer carrying **Anulează**, which re-POSTs the `ExpenseRequest`
captured *before* the delete. The entry comes back with a new id - no soft-delete column, no Envers.
`requestFrom(expense)` in `api/expenses.ts` is the `Expense` → `ExpenseRequest` mapping (`type`, not
`entryType`; `fxRate: null` for RON; `originalAmount`, never `signedAmountRon`).

The orchestration sits in `EditExpenseModal`, not in `useDeleteExpense`: `api/` holds thin transport
hooks and imports no `lib/notify`, `lib/format` or `labels`, all of which the offer needs. Revisit
when A5 adds a second delete call site. `notifyUndo` itself is generic - A4 and A6 can reuse it.

### Five things this turned up
1. **`notifications.show` silently drops a notification whose `id` is already on screen.** A stable id
   would swallow the second of two quick deletes, so `notifyUndo` mints a fresh `randomId()` per offer
   (it needs one anyway, to `hide` on click).
2. **Mantine 9 notifications have no `action` prop.** `message` is a `ReactNode` rendered as the
   `Notification`'s children, so the button goes inside it - which is why `lib/notify.ts` became
   `notify.tsx`. Every import was extensionless, so the rename touched nothing else. Hover *and* focus
   pause auto-close, so a keyboard user tabbing to the button is safe for free.
3. **`mutate` vs `mutateAsync` for work that outlives its component.** TanStack Query drops `mutate`'s
   per-call `onSuccess`/`onError` once the owning observer has no listeners, but the hook-level
   `onSuccess` (the shared `invalidate`) always runs and `mutateAsync`'s promise always settles. The
   restore hangs its toasts off `mutateAsync().then/.catch` so undoing after navigating away still
   reports. (`EditExpenseModal` is never unmounted by closing - `ExpensesPage` renders it
   unconditionally with `expense={editing}` - but the route can still change.)
4. **The notifications store is a module-level singleton**: entries survive RTL `cleanup` and reappear
   in the next test that mounts a container. `src/test/setup.ts` now calls `notifications.clean()` and
   `cleanQueue()` in `afterEach`, and `src/test/render.tsx` mounts `<Notifications />` so tests render
   the same shell as `App.tsx`. Don't use fake timers - Mantine's transitions and the auto-close both
   hang off `window.setTimeout`, and 8 s never elapses in a test anyway.
5. **A restore re-runs `merchantRules.learn`.** Pinned rules only move `hit_count`; an unpinned rule is
   rewritten to what it already was, unless a *different* entry for the same merchant was saved inside
   the same 8 seconds. Not worth code.

6. **A Mantine `Button` inside a `nowrap` `Group` shrinks and clips its own label** - its label span
   is `overflow: hidden`, so "Anulează" rendered as "Anuleaz" (`clientWidth` 51 vs `scrollWidth` 62)
   next to a long message. `flex="0 0 auto"` on the button fixes it. **jsdom has no layout**, so no
   component test can catch this class of bug - measure `scrollWidth > clientWidth` in the Browser
   pane instead.

Also: a restore whose category or account was archived in the meantime is refused by
`ExpenseService.resolveCategory` (400 - there is no "current" category to grandfather on a create).
`isTransientError` in `notify.tsx` keeps the retry offer for 0/5xx only, since a 4xx would fail again.
A Mantine `Modal` only renders its content while `opened`, so a test asserting `ConfirmDialog` copy
must open it first.

## Raspberry Pi deployment (documented, not yet performed)
`docs/HOWTO-deploy-pi.md` is the first-install guide: prerequisites, build, verification, backups,
day-to-day. The README's Pi section links it and keeps only the short version. As of writing, the Pi
deploy has **not actually been run** - the prod compose path is proven only on the Mac
(`scripts/mac-app.sh`, same `docker-compose.prod.yml`).

What was checked before writing it:
- **All five base images have arm64 manifests** (temurin 25 jdk/jre, node:24-slim, nginx:stable-alpine,
  postgres:17-alpine), so nothing needs cross-building.
- **`frontend/package-lock.json` carries the linux-arm64 native binaries** the build needs -
  `@typescript/typescript-linux-arm64`, `@rolldown/binding-linux-arm64-gnu`,
  `lightningcss-linux-arm64-gnu`. This is why the glibc `node:24-slim` build stage matters: the musl
  variants exist too, but Alpine would pull `-musl` bindings into a build that expects glibc.
- Prerequisites that decide whether the build works at all: 64-bit OS; **Docker CE with Compose v2**,
  because both Dockerfiles use `RUN --mount=type=cache` and Raspberry Pi OS's `docker.io` +
  `docker-compose` v1 have no BuildKit; swap raised on a 4 GB Pi (`CONF_MAXSWAP` caps `CONF_SWAPSIZE`,
  so both must change) or the two services built separately; an SSH deploy key, since the repo is private.
- The backend healthcheck tolerates ~4 minutes on first boot (90 s `start_period` + 10 x 15 s), which
  is the Liquibase run against an empty DB.

### The backups directory was missing from a fresh clone
`.gitignore` had a bare `backups/`, so **nothing inside it was tracked and a fresh clone had no such
directory**. The README's cron line redirects into `backups/backup.log`, and the shell opens that
redirect *before* running the script - so `scripts/backup.sh`'s own `mkdir -p` never got the chance and
the first cron backup died silently. Fixed two ways: `backups/*` + `!backups/.gitkeep` in `.gitignore`
(dumps, logs and `backups/mac/` stay ignored), and `mkdir -p backups &&` added to the cron line in both
the README and the script's header comment. **Any git-ignored directory a cron job writes into needs
this treatment.**
