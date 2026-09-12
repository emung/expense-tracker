# Project memories

## Maven must never use the work registries
The user-level `~/.m2/settings.xml` has a work profile (`prolion`) that is active by default and adds private Nexus repositories. This project must never resolve anything from them.
- `backend/.mvn/maven.config` passes `--settings` and `--global-settings`, both set to `.mvn/settings.xml`. That replaces both `~/.m2/settings.xml` and the Maven installation's `conf/settings.xml`, so neither is ever read.
- `backend/.mvn/settings.xml` uses a separate local repo (`~/.m2/repository-expense-tracker`) and one mirror, `mirrorOf *`, pointing to Maven Central.
- `pom.xml` declares no `<repositories>` or `<pluginRepositories>`.
- In IntelliJ, override the Maven "User settings file" and "Local repository" with the values above.
- To check: `./mvnw help:effective-settings` should not mention prolion.

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

## Infrastructure decisions
- Git remote: GitHub (`emung/expense-tracker`). There is no container registry.
- The Pi 5 builds the images itself: `git pull && docker compose -f docker-compose.prod.yml up -d --build`.
- Local Docker runtime is OrbStack (Docker 29), so use Testcontainers 2.x.
- Only JDK 26 is installed locally; the project targets `--release 25` and the Docker images use Temurin 25.
