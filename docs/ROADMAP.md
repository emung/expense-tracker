# Roadmap v2

v1 replaced the Numbers spreadsheet and is in daily use. The data model, money handling and the
monthly report are solid — but the app is still *manual capture plus one descriptive report*: every
row is typed by hand, the EUR rate is typed by hand, nothing recurs, and the report tells you what
you spent without telling you whether that was fine.

This document is the plan for closing that gap. It is a menu with an opinion, not a commitment: each
item carries the Romanian UI wording, why it beats the spreadsheet, and how it fits the code that
actually exists today.

**Decisions already taken**

- Bank import targets **SaltBank CSV**. PDF statements are deferred; Revolut is not imported at all
  (1–2 entries a month, typed manually).
- Budgets are a **fixed monthly plan per category**, not a rolling average.
- **Capture friction is the first slice.** Analytics come once capture is complete enough to trust.

---

## Foundations — reuse these, don't reinvent them

Every feature below is written to route through machinery that already exists:

| Existing | Why new work must go through it |
|---|---|
| [`MoneyCalculator.toBase`](../backend/src/main/java/dev/emung/expensetracker/common/money/MoneyCalculator.java) | The single conversion point. CSV import, recurring templates and BNR auto-fill must call it — never recompute `amount_ron` at a second site. |
| [`Expense.setAmount(...)`](../backend/src/main/java/dev/emung/expensetracker/expense/Expense.java) | The four money fields move together, so they can't drift apart. There are no individual setters, deliberately. |
| `ExpenseSpecifications` + `ExpenseTotalsRepository` | Totals are a Criteria tuple query reusing the list's `Specification`, so rows and totals always agree. A new filter added to the Specification gets correct totals for free. |
| [`MerchantQueryRepository`](../backend/src/main/java/dev/emung/expensetracker/expense/MerchantQueryRepository.java) | Already ranks merchant suggestions with a CTE + window functions. Auto-categorization extends this query rather than starting a new one. |
| [`ReportQueryRepository`](../backend/src/main/java/dev/emung/expensetracker/report/ReportQueryRepository.java) | One `JdbcClient` native query using `SUM(...) FILTER (WHERE entry_type = ...)`. Every new aggregate below is one more `FILTER` or one more date range on that pattern — not a new stack. |
| `GlobalExceptionHandler` + `lib/formErrors.ts` | Throw `BusinessRuleException("fieldName", "mesaj")` and the message lands on the right Mantine form field automatically, via the `SERVER_FIELDS` map in `ExpenseForm`. |
| `lib/expression.ts` | The no-`eval` recursive-descent parser. Any new amount input reuses it. |
| `useInvalidateAfterExpenseChange` | One place to register new query keys so caches stay coherent after a mutation. |

**Constraints to respect**

- `ddl-auto: validate` — the schema belongs to Liquibase alone. New changesets only, numbered `006+`,
  never edit an applied one.
- `CurrencyCode` is closed to RON/EUR by DB CHECK constraints in changesets `002` and `003`.
- nginx caps request bodies at **1 MB** (`frontend/nginx/default.conf`).
- There is currently **no** scheduling, HTTP client, caching, file storage or CI anywhere in the repo.
  Several features below introduce the first of their kind.

---

## A. Input friction reduction & capture

*The v2.0 slice. Ordered — A1 is a prerequisite for A5.*

### A1. Learned auto-categorization — "Reguli magazin" / "Completare automată"

**Value.** The spreadsheet made you re-pick the category for Lidl forty times a year. From the second
entry onwards this becomes a two-field form: merchant and amount. It is also the brain the CSV
importer uses to pre-categorize hundreds of rows at once, which is why it has to land first.

**Tech.** Changeset `006-create-merchant-rule.yaml`:

```
merchant_rule(id, merchant_key varchar(200) NN, category_id NN FK RESTRICT,
              account_id nullable FK, hit_count int default 0, created_at, updated_at)
```

plus `CREATE UNIQUE INDEX ux_merchant_rule_key ON merchant_rule (lower(merchant_key))` in a raw `sql`
block — the established pattern for expression indexes, since Liquibase OSS can't express them.

Upsert the rule inside `ExpenseService.create` via `JdbcClient`
(`ON CONFLICT (lower(merchant_key)) DO UPDATE SET category_id = EXCLUDED.category_id, hit_count = merchant_rule.hit_count + 1`).
Extend `MerchantSuggestion` with `categoryId`, `accountId` and `lastAmount`.

Frontend: `MerchantAutocomplete`'s `onSuggestionPicked` already respects the `categoryChosen` /
`accountChosen` refs in `ExpenseForm`, so richer suggestion data flows into the existing path without
overwriting a choice the user made by hand. Add an editable rules list under `features/settings/`
reusing `SettingsSection`.

### A2. Keyboard-first entry — "Scurtături"

**Value.** Saving on Enter already works. This closes the rest of the loop, so an evening of catching
up on entries never needs the mouse.

**Tech.** Mantine `useHotkeys` in `AppLayout`: `n` focuses the quick-add merchant field (the
`data-autofocus` target exists), `/` focuses the filters search, `g r` / `g c` navigate to report and
expenses, `?` opens a cheat-sheet `Modal`. `Ctrl+Enter` saves and keeps going — the form already
preserves date, account, currency and rate after a create and refocuses merchant.

Pure frontend, no schema. Note when verifying: an automated `key Return` in the Browser pane arrives
with `event.key === ""`, so exercise hotkeys with a synthetic `KeyboardEvent` through `javascript_tool`.

**Two more things belong in this slice**, because they are the same surface and cost far less done here
than bolted on later:

- **Fix the searchable `Select`.** Typing into one appends to the label of the option already selected
  instead of replacing it, so changing a category by keyboard means clearing the field first. Found
  while testing A1 (the rule editor) but shared with `ExpenseForm`, so it is not a new defect — it is
  squarely a keyboard-entry one, and A2 is where it should be fixed.
- **Add `@testing-library/react` and the `jsdom` environment** (this is E4, pulled forward). A2 is
  entirely keyboard behaviour: tedious to check by hand, easy to regress silently, and impossible to
  cover today because `vite.config.ts` includes only `src/**/*.test.ts` and nothing renders. Doing it
  here means the shortcuts ship with real coverage, and A4 and A5 land on a form that already has it.

### A3. Undo on delete — "Anulează ștergerea"

**Value.** Rows are clickable and delete sits one click away; a mis-click currently costs a retype.
Removes the fear tax that makes fast entry slow.

**Tech.** No soft-delete column and no audit table. `useDeleteExpense`'s `onSuccess` shows a Mantine
notification carrying an **Anulează** action that re-POSTs the captured `ExpenseRequest`. Deliberately
not Envers — for a single-user tracker, a new id is a perfectly good undo.

### A4. Recurring expenses — "Cheltuieli recurente" / "De confirmat"

**Value.** Rent, subscriptions, utilities — the fixed ten-ish entries you retype every single month.
Propose-and-confirm rather than auto-insert, so the ledger never contains a bill you didn't actually pay.

**Tech.** Changeset `007-create-recurring-expense.yaml`:

```
recurring_expense(id, merchant, category_id, account_id, entry_type,
                  original_amount, original_currency, fx_rate,
                  day_of_month smallint CHECK (1..31), active boolean, details, ...)
```

plus a nullable `recurring_id` FK on `expense`, so "already confirmed this month" is an exact join
rather than a heuristic match on merchant and amount.

**Compute "due" at query time, not with a scheduler.** `GET /api/recurring/due?month=yyyy-MM` returns
templates whose expected entry is absent from that month (`NOT EXISTS` against `expense`). This is
catch-up-safe on a Pi that reboots or sits powered off, and it needs no `@EnableScheduling` at all.

`POST /api/recurring/{id}/confirm` builds an `ExpenseRequest` and goes through `ExpenseService.create`,
so conversion and validation take the identical path as manual entry.

UI: a Mantine `Card` stack above the quick-add form on `ExpensesPage`, each with **Confirmă** /
**Modifică** / **Sari peste luna asta**, and a count badge in the nav. Register
`queryKeys.recurring.due(month)` in `useInvalidateAfterExpenseChange`.

### A5. SaltBank CSV import — "Import extras de cont"

**Value.** The single biggest lever in this document. A month of card transactions goes from roughly
sixty typed rows to one upload plus a review pass, with A1 filling in most categories before you look.

**Tech.** Three steps, staged server-side so a page reload doesn't lose the work.

Changeset `008-create-import.yaml`:

```
import_batch(id, filename, row_count, imported_count, status, created_at)
import_row(id, batch_id FK CASCADE, line_no, raw_line text,
           parsed_date, parsed_merchant, parsed_amount, parsed_currency,
           suggested_category_id, duplicate_of_expense_id, status)
```

Also add a nullable `external_ref varchar(120)` to `expense` with
`CREATE UNIQUE INDEX ux_expense_external_ref ON expense (external_ref) WHERE external_ref IS NOT NULL`.
A **partial** unique index makes re-importing the same statement physically impossible to duplicate
while leaving every hand-typed row unconstrained.

**Parse with a profile, not hardcoded columns.** Romanian bank exports vary in charset (frequently
windows-1250 or ISO-8859-2 rather than UTF-8), delimiter (usually `;`), decimal convention
(`1.234,56`), date format, and whether the amount is one signed column or separate debit and credit
columns. Model these as a `SaltBankProfile` record and let the preview screen show the detected guess
so a format change is a visible mismatch instead of silent corruption.

> **Step one of implementing this is to open a real SaltBank export and read its actual header.**
> Do not design the parser from assumptions about what the file contains.

Dependencies and limits: add `org.apache.commons:commons-csv` (small, and it handles quoting and
escaping correctly — hand-rolled splitting on `;` will not). Set
`spring.servlet.multipart.max-file-size: 5MB` in `application.yml` **and raise nginx
`client_max_body_size` from `1m` to `10m`** — otherwise the proxy returns 413 before Spring ever sees
the upload.

Duplicate detection beyond `external_ref`: flag rows matching an existing expense on
`(expense_date, amount_ron, lower(merchant))` within ±3 days, and present them pre-unchecked rather
than dropping them silently.

The commit step loops the checked rows through `ExpenseService.create` inside one `@Transactional`
method, so imported and typed expenses are indistinguishable in how they were validated and converted.

UI: an `/import` route with a Mantine `Dropzone` feeding a `Stepper`
(Încarcă → Previzualizare → Confirmă), then an editable `Table` with a per-row category `Select` and
an include `Checkbox`. Romanian: "Rânduri identificate", "Posibil duplicat",
"Importă 47 de cheltuieli" — use `lib/plural.ts` `countLabel` for the "de" rule.

### A6. Bulk paste — "Adăugare rapidă multiplă"

**Value.** For months with no export, and for the Revolut entries you type by hand: paste
`12.09 Lidl 88,74` lines instead of filling the form once per row.

**Tech.** The same preview-and-commit pipeline as A5 with a `text/plain` body instead of multipart —
a tab inside the import stepper, not a second screen. Reuses `lib/expression.ts` for the amount and
`parseDateInput` for the date.

### A7. Receipt photos and OCR — "Bon (fotografie)"

**Deliberately deferred.** Storage needs a bind-mounted volume on the Pi, a `.gitignore` entry, a
raised body limit, and inclusion in `scripts/backup.sh` — which today dumps Postgres only, so photos
would silently *not* be backed up. Tesseract with Romanian data on an ARM Pi is slow, and the
realistic win is one field you can type in two seconds.

Revisit only if receipt *retrieval* (warranty, returns) becomes the actual need — at which point
plain attachment without OCR is the right feature, and a much smaller one.

---

## B. Analytics, Recharts & reporting

### B1. Month-over-month comparison — "Față de luna trecută"

**Value.** "1.842 lei on Mâncare" means nothing on its own. "+310 lei față de august" is a decision.

**Tech.** `GET /api/reports/monthly-by-category?month=&compare=previous`. Extend the existing SQL to
two half-open ranges in a single round-trip — a second pair of aggregates with
`FILTER (WHERE e.expense_date >= :prevStart AND e.expense_date < :prevEnd)`, no second query.
`CategoryTotal` gains `previousNetRon`, `deltaRon` and `deltaPercent`.

Chart: keep the single-accent-color decision from v1. Render a muted **ghost bar** for the previous
month behind each current bar — two Recharts `<Bar>` elements sharing an `xAxisId`, the ghost drawn in
a neutral grey already present in the `PALETTE.light` / `PALETTE.dark` object in `CategoryBarChart`.
One comparison against one baseline is exactly what a background bar encodes well; it does not
reintroduce per-category colors. The table gains a delta column with `IconArrowUpRight` /
`IconArrowDownRight` in red and teal.

### B2. Budget vs. actual — "Buget lunar"

**Value.** Turns the report from a mirror into a guardrail — the one thing the spreadsheet genuinely
could not do without hand-written formulas per month tab.

**Tech.** Changeset `009-create-category-budget.yaml`:

```
category_budget(id, category_id FK, valid_from date NN,
                amount_ron numeric(12,2) NN CHECK (> 0),
                UNIQUE (category_id, valid_from))
```

**Version by effective month rather than putting a column on `category`.** When you raise the food
budget in March, February's report must still show February's target — a plain column would silently
rewrite history every time you adjust a number.

Lookup joins cleanly into the existing report query with Postgres `DISTINCT ON`:

```sql
SELECT DISTINCT ON (category_id) category_id, amount_ron
FROM category_budget
WHERE valid_from <= :monthStart
ORDER BY category_id, valid_from DESC
```

Response adds `budgetRon` and `usedPercent`. UI: a Mantine `Progress` per row in `ReportTable`, red
past 100%, plus a `SummaryCards` tile for "Rămas din buget". Editing lives in `features/settings/` as
a `BudgetsSection`. Romanian: "Planificat", "Cheltuit", "Rămas", "Depășit cu 240,10 lei".

### B3. Twelve-month trend — "Evoluție lunară"

**Value.** Answers "is this getting worse?", which a spreadsheet of per-month tabs structurally cannot.

**Tech.** `GET /api/reports/monthly-totals?from=&to=&categoryId=`. Use
`generate_series(:from, :to, interval '1 month')` LEFT JOINed against `date_trunc('month', expense_date)`
so months with no spending come back as zeros instead of being gap-filled in TypeScript.

Recharts `AreaChart`, single accent color, with a dashed `ReferenceLine` at the period mean so the
trend has something to be read against. Lives on the already-lazy `/raport` route, keeping Recharts
out of the initial bundle.

### B4. Recurring-bill detection — "Posibile cheltuieli recurente"

**Value.** Finds the subscriptions you forgot you were paying, and bootstraps A4 instead of making you
type ten templates by hand.

**Tech.** Plain SQL, no ML. Group by `lower(merchant)` over the last six months; keep merchants present
in at least four distinct months where `stddev_pop(amount_ron) / avg(amount_ron) < 0.15`. Surface each
as a "Creează șablon" button that pre-fills the A4 form. One `JdbcClient` query in `report`.

### B5. Top merchants per category — "Top magazine"

**Value.** The report says Mâncare is 2.100 lei; this says 1.400 of it was one hypermarket. That is the
difference between a number and something you can act on.

**Tech.** `GET /api/reports/top-merchants?month=&categoryId=&limit=10`, a `SUM(amount_ron)` grouped by
`lower(merchant)`. Render as a compact list rather than a second chart — `ReportTable` rows already
navigate to the filtered expense list, so this is the first step of that drill-down, not a rival to it.

### B6. Year overview — "Rezumat anual"

**Value.** One screen for "where did 2026 go", and the natural input to next year's budgets.

**Tech.** A table of 13 categories × 12 months with an annual total and a small per-row Recharts
sparkline (`LineChart`, no axes, ~40px). Explicitly **not** a 13-series stacked chart and not a donut —
the same reasoning that produced v1's single-color horizontal bars.

---

## C. Account & multi-currency management

### C1. Automatic BNR rates — "Curs BNR"

**Value.** Kills the last manual-lookup step in the app. Today the EUR rate is typed by hand and cached
in `localStorage`; what is actually correct is the rate for the *transaction's own date*, and only the
server can know that.

**Tech.** Changeset `010-create-fx-rate.yaml`:

```
fx_rate(rate_date date, currency char(3), rate numeric(12,6) NN CHECK (> 0),
        source varchar(20), fetched_at timestamptz,
        PRIMARY KEY (rate_date, currency))
```

Source: BNR's published daily FX XML, with the ten-day file for catch-up and the per-year archive for
backfill. Verify the exact URLs when implementing, and **parse the `multiplier` attribute** rather than
assuming it is 1 — it is 1 for EUR, USD and GBP, but not for every currency in the file.

Client: a `RestClient` bean. It is already on the classpath via `spring-boot-starter-webmvc`, but **no
bean exists today** — this is the first outbound HTTP call in the codebase. Parse with JDK
`DocumentBuilderFactory` with DTDs and external entities disabled; for a file this small that avoids
pulling in `jackson-dataformat-xml`.

Scheduling: `@EnableScheduling` plus
`@Scheduled(cron = "0 30 13 * * MON-FRI", zone = "Europe/Bucharest")`, since BNR publishes around
13:00 local time. The job must be **catch-up-shaped** — fetch the ten-day file and upsert everything
missing — so a Pi that was powered off for three days heals itself on the next run. Add a startup
backfill and a manual "Actualizează cursul" button.

API: `GET /api/fx-rates?date=&currency=` returns the rate on or before that date, along with the date
it actually came from.

Frontend: the rate field auto-fills when the date or currency changes, stays editable (your card's
rate may differ from BNR's), and shows `description="curs BNR 18.09.2026"` so the source is never
ambiguous. Keep the `localStorage` last-rate as the offline fallback.

### C2. Transfers between accounts — "Transfer între conturi"

**Value.** Moving money to Revolut currently either pollutes a spending category or goes unrecorded.

**Tech.** **A separate `transfer` table — not a third `EntryType`.** Adding `TRANSFER` to the enum
would break `ck_expense_entry_type`, and worse, it would quietly enter every
`SUM(amount_ron) FILTER (WHERE entry_type = 'EXPENSE')` decision in the report and in
`ExpenseTotalsRepository`. A separate table keeps `expense` meaning "money that left the household" and
leaves all existing report math untouched.

Changeset `011`:
`transfer(id, transfer_date, from_account_id, to_account_id CHECK (<> from_account_id), amount_from, currency_from, amount_to, currency_to, details)`.
Its own route and tab, deliberately outside the category report.

### C3. Account balances & reconciliation — "Sold" / "Reconciliere"

**Honest priority: low until A5 ships.** An opening balance plus a running total is easy — a `SUM` over
`expense` and `transfer`. But a computed balance is only *trustworthy* if every transaction was
captured, which is precisely what CSV import provides and manual entry does not. A balance that is
quietly wrong is worse than no balance at all.

After A5: `account.opening_balance` and `opening_balance_date`, plus a screen comparing the computed
balance against the statement's closing balance.

### C4. Additional currencies — "Monede suplimentare (USD, GBP)"

**Tech.** Not merely an enum change. A changeset must
`ALTER TABLE expense DROP CONSTRAINT ck_expense_original_currency` and re-add it with the wider set,
and the same for `ck_account_default_currency` from changeset `002`. `SchemaMigrationIT` asserts those
CHECKs reject bad raw inserts, so those tests move in the same commit.

Frontend: generalize `formatEur` into `formatMoney(amount, currency)` in `lib/format.ts`. Only worth
doing once C1 supplies the rates automatically — otherwise it is three more currencies to look up by hand.

---

## D. Romanian market & localization

### D1. Diacritics-insensitive search — "Căutare fără diacritice"

**Value.** Typing `mancare` should find `Mâncare`, and `Petrol` should find `Petrom`. Real friction on
a phone keyboard, and it directly improves merchant-rule matching for the importer.

**Tech.** A changeset with `CREATE EXTENSION IF NOT EXISTS unaccent;` (present in `postgres:17-alpine`),
wrapped in `preConditions` with `onFail: MARK_RAN`. Then
`CREATE INDEX ix_expense_merchant_unaccent ON expense (lower(unaccent(merchant)))`.

One gotcha: `unaccent(text)` is only `STABLE`, because it depends on the search path for its
dictionary, so it cannot be used in an index expression directly. The standard workaround is a small
`IMMUTABLE` SQL wrapper calling the two-argument `unaccent('unaccent', $1)`, created in the same
changeset. Adjust the `q` predicate in `ExpenseSpecifications` to match — its LIKE-wildcard escaping is
already covered by `ExpenseServiceIT`.

### D2. Grouped amounts on paste — "Sume cu separator de mii"

**Value.** `lib/expression.ts` explicitly rejects thousand separators, which is *correct* for a formula
(`1.234+5` is genuinely ambiguous) but wrong when you paste `1.234,56` out of a bank page or statement.

**Tech.** A `parsePlainAmount` path tried first when `isFormula()` is false, accepting `1.234,56`,
`1234,56` and `1234.56`. Formula strings keep today's stricter rules. Pure `lib/` change, with unit
tests alongside the existing `expression.test.ts`.

### D3. Export — "Export CSV"

**Value.** The escape hatch that makes leaving the spreadsheet feel safe, and the format a year-end
review or an accountant actually wants.

**Tech.** `GET /api/expenses/export` reusing **the same `ExpenseFilter` and `Specification` as the
list**, so "export what I'm looking at" is literally true rather than approximately true. Stream with
`StreamingResponseBody`; `;` delimiter, `1.234,56` decimals, `dd.MM.yyyy` dates, and a **UTF-8 BOM** so
Excel in ro-RO opens diacritics correctly instead of mojibake.
`Content-Disposition: attachment; filename="cheltuieli-2026-09.csv"`.

### D4. Pay-cycle months — "Luna de salariu" *(optional)*

**Value.** If your salary lands on the 25th, a calendar month splits every budgeting decision in half.

**Tech.** Cheap at the query layer, because ranges are already half-open `[start, end)` — a single
`month_start_day` setting shifts what `ReportService.monthlyByCategory` derives from a `YearMonth`. The
real complexity is all in labelling ("25.08 – 24.09") and in `useMonthParam`. Ship it only if the pay
cycle genuinely bothers you; it makes every other screen's wording harder.

### D5. Formatting polish

`formatMonth`'s hardcoded `MONTH_NAMES` array is deliberate and deterministic — keep it over `Intl`
month names. Worth adding: an in-app light/dark toggle. `useMantineColorScheme` is currently unused
anywhere; the app only follows the OS, and `useComputedColorScheme` appears in exactly one place
(the chart palette).

---

## E. Backend & developer experience

### E1. Scheduling foundation — catch-up by design

`@EnableScheduling` does not exist yet. When C1 introduces it, every job must be written as "reconcile
whatever is missing", never "run once at time T" — a Raspberry Pi reboots, loses power and drifts.

Keep jobs in one `ScheduledTasks` class with an explicit `zone = "Europe/Bucharest"`, and keep the
actual work in a service that a manual endpoint can also call, so a job is always testable without
waiting for a cron to fire.

### E2. Backup health, surfaced in the app — "Stare copii de siguranță"

**Value.** `scripts/backup.sh` is solid — atomic `.partial` then `mv`, retention, custom format — and
the README documents the Pi crontab. But a backup nobody looks at is a backup that silently stopped
three months ago.

**Tech.** A custom Actuator `HealthIndicator`, or `GET /api/system/status`, reporting: the newest file
in `BACKUP_DIR` and its age, the count of applied `databasechangelog` rows, database size, and app
version. Show it as a quiet footer line in Setări that turns red past 48 hours.

Two additions to the script itself: verify each dump with `pg_restore --list` immediately after writing
it, so a corrupt dump fails loudly at creation rather than at restore; and document an off-Pi rsync —
a backup sitting on the same SD card as the database is not a backup.

### E3. Liquibase patterns worth keeping

The existing convention is good and should be written down rather than rediscovered: one changeset per
file, `id` matching the filename stem, `author: emi`, an **explicit `rollback` on every changeset**, and
raw `sql` blocks for CHECK constraints and expression indexes that Liquibase OSS cannot express — with
the explanatory comment, as in `003-create-expense.yaml`.

Two additions for v2: `preConditions` with `onFail: MARK_RAN` around `CREATE EXTENSION`, and
`context: seed` on any future seed data so it doesn't fight integration tests. `SchemaMigrationIT`
already asserts the database rejects bad raw inserts — every new CHECK gets a case there.

### E4. Frontend test coverage, before the form grows

**Pulled forward into A2** — see that section. Kept here for the reasoning.

`vite.config.ts` includes only `src/**/*.test.ts`, so **`.tsx` component tests are excluded by
configuration** and none exist. `ExpenseForm` is about to absorb recurring templates, BNR auto-fill and
import editing — it is the most behavior-dense file in the frontend and the least covered.

Add `@testing-library/react` and the `jsdom` environment and widen the include to `.tsx` *before* that
work, not after. Separately: there is no ESLint, Prettier or Biome config anywhere, despite
`eslint-disable` comments in the source. Biome is one dependency for both lint and format, which suits
a project this size better than the full ESLint stack.

### E5. CI — `./mvnw verify` and `npm run build`

No CI exists; builds and deploys are manual on the host. This repo's remote is GitHub
(`emung/expense-tracker`), so: one Actions job running `./mvnw verify` (Testcontainers works on
`ubuntu-latest`, and `.mvn/maven.config` keeps the isolated settings automatically) and one running
`npm ci && npm run build`.

This matters far more once the importer exists — a parser regression should not first be discovered
against a real bank statement.

### E6. OpenAPI and generated types *(optional)*

`api/types.ts` is hand-maintained against the backend DTOs and will drift as the surface grows from
four endpoints to roughly twelve. `springdoc-openapi` plus type generation into the frontend removes a
whole class of silent mismatch. Worth doing at the end of v2, not the start — generating types for an
API still changing shape daily is churn.

### E7. What not to build

Named explicitly so they stay out of scope:

- **Multi-user or auth** — LAN-only with no login is the design, not an oversight.
- **Envers or audit tables** — Undo (A3) covers the real need.
- **Redis or Spring Cache** — one user, a Pi, a few thousand rows; `ix_expense_date` already covers the
  hot query. Revisit when there is a measured problem.
- **Event sourcing**, **a mobile app** (the UI is responsive), and **OCR** (see A7).

---

## Sequencing

| Milestone | Contents | Why this order |
|---|---|---|
| **v2.0 — Captură** | A1 merchant rules → A2 shortcuts (+ searchable `Select` fix, + E4 test setup) → A3 undo → A4 recurring → A5 SaltBank CSV import → D3 export | A1 is the importer's categorization brain and must come first. A2 and A3 are hours of work for daily payoff. A5 is the big one and lands on top of A1. |
| **v2.1 — Claritate** | B2 budgets → B1 month-over-month → B3 trend → B4 recurring detection → B5 top merchants | Budgets need a few months of complete data, which v2.0 produces. B4 loops back and feeds A4. |
| **v2.2 — Automatizare** | C1 BNR + E1 scheduling → E2 backup health → D1 unaccent search → D2 paste amounts | The first outbound HTTP call and the first scheduler in the codebase — worth doing as one deliberate slice, with E2's safety net alongside. |
| **Later, on trigger** | A7 receipts, PDF import, C2 transfers, C3 balances, C4 currencies, B6 year overview, E5–E6 | Each has a condition that should prompt it, rather than a date. |
