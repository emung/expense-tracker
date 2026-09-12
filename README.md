# expense-tracker

A self-hosted, single-user tracker for personal expenses that replaces a spreadsheet kept in Apple Numbers. The UI is in Romanian.

- **Backend:** Spring Boot 4 (Java 25), Maven, Liquibase, PostgreSQL 17
- **Frontend:** React, Vite, TypeScript, Mantine, TanStack Query, Recharts
- **Runtime:** Docker Compose, on a Mac for development and on a Raspberry Pi 5 in production

## Repository layout

| Path | Contents |
|---|---|
| `backend/` | Spring Boot REST API (`/api/**`) and the Liquibase changelogs |
| `frontend/` | React single-page app, served by nginx in Docker |
| `docker-compose.yml` | Local development setup |
| `docker-compose.prod.yml` | Raspberry Pi setup, which builds the images on the Pi |

## Development

> Setup, deployment and backup instructions will be added as the implementation progresses.

### Maven isolation (important)

The backend's `.mvn/maven.config` points Maven at `backend/.mvn/settings.xml`. As a result:

- the user-level `~/.m2/settings.xml` is **never** read;
- every dependency comes from Maven Central only;
- downloads go to a separate local cache, `~/.m2/repository-expense-tracker`.

Always run `./mvnw` from inside `backend/`.
