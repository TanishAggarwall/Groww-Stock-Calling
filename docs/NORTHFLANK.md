# Northflank backend

Deploy branch `deploy/northflank` using its root Dockerfile. This branch leaves the Vercel frontend source and submission project unchanged.

- One instance only: PGlite is an embedded PostgreSQL database.
- Mount a dedicated persistent volume at `/var/lib/stock-calling`. Never reuse another application's volume.
- Expose container port `3000` as HTTP; use `/health` for readiness/liveness.
- Set `DASHBOARD_PASSWORD` to a random string of at least 20 characters. HTTP Basic username is `team-bb`. All dashboard and API routes require login; `/health` exposes only readiness.
- Set `APP_URL` to the generated HTTPS service URL. Set `FRONTEND_ORIGIN` only for the exact frontend origin you intend to allow.
- Set `OMNIDIM_API_KEY`, `OMNIDIM_AGENT_ID`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` and `DEMO_SELL_PIN` as runtime secrets. Never add them as build arguments or commit them.
- The Docker image sets `CLOUD_MODE=true`, `DATA_DIR` and `SECRET_FILE` automatically. Integration replacements saved through Settings persist on the volume.
- Cloud settings and histories start fresh. Local history remains on the laptop. Register your phone, consent and Telegram chat in the hosted dashboard before live calls.
- The worker checks call results and pending Telegram messages every 20 seconds; source monitoring runs every 30 minutes when enabled.

Cloud deployment smoke verification covers public health, rejected anonymous API access, successful authenticated API, blocked untrusted origins and the hosted UI. The regular six tests and TypeScript/Vite build must also pass.
