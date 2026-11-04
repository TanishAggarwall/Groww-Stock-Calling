# Northflank backend

Deploy branch `deploy/northflank` using its root Dockerfile. This branch leaves the Vercel frontend source and submission project unchanged.

- Use the private `groww-postgres` managed PostgreSQL addon via `DATABASE_URL`. Northflank's free standalone-volume allowance is already used by another app, so this backend uses the available free database allowance instead. Keep one backend instance to avoid duplicate polling workers.
- Local runs without `DATABASE_URL` continue using PGlite under `data/postgres`.
- Expose container port `3000` as HTTP; use `/health` for readiness/liveness.
- Set `DASHBOARD_PASSWORD` to a random string of at least 20 characters. HTTP Basic username is `team-bb`. All dashboard and API routes require login; `/health` exposes only readiness.
- Set `APP_URL` to the generated HTTPS service URL. Set `FRONTEND_ORIGIN` only for the exact frontend origin you intend to allow.
- Set `OMNIDIM_API_KEY`, `OMNIDIM_AGENT_ID`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` and `DEMO_SELL_PIN` as runtime secrets. Never add them as build arguments or commit them.
- The Docker image sets `CLOUD_MODE=true`. Configure hosted provider secrets in Northflank runtime variables; the hosted UI rejects replacements that would otherwise be lost on container restarts.
- Cloud settings and histories start fresh. Local history remains on the laptop. Register your phone, consent and Telegram chat in the hosted dashboard before live calls.
- The worker checks call results and pending Telegram messages every 20 seconds; source monitoring runs every 30 minutes when enabled.

Cloud deployment smoke verification covers public health, rejected anonymous API access, successful authenticated API, blocked untrusted origins and the hosted UI. The regular six tests and TypeScript/Vite build must also pass.
