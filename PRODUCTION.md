## Production Readiness Notes

### 1) Schema migrations (Flyway)

- Hibernate auto schema updates are disabled:
  - `spring.jpa.hibernate.ddl-auto=validate`
- Flyway is the source of truth for schema evolution.
- Current migration files:
  - `V1__enforce_workout_owner.sql`
  - `V2__create_refresh_tokens.sql`
  - `V3__create_core_workout_schema.sql`

### 2) Production profile

- Use Spring profile: `prod`
- Config file: `backend/src/main/resources/application-prod.properties`
- Sensitive settings are loaded from environment variables (no fallback secrets in prod).

### 3) Docker production stack

1. Copy env template:
   - `copy .env.prod.example .env.prod`
2. Set strong secrets in `.env.prod` (especially `JWT_SECRET` and DB password).
3. Start production stack:
   - `docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build`

### 4) Health checks and monitoring

- Backend health endpoint:
  - `http://localhost:8080/actuator/health/readiness`
- Prometheus metrics endpoint:
  - `http://localhost:8080/actuator/prometheus`

### 5) Security reminder

- Keep `AUTH_COOKIE_SECURE=true` in real production behind HTTPS.
- Rotate JWT secret and DB credentials before going live.
