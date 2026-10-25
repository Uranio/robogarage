# RoboGarage — Production go-live checklist

## 0. Legal (do first)
- [ ] Fill in all [PLACEHOLDERS] in LICENSE, PRIVACY_POLICY.md, TERMS_OF_SERVICE.md
- [ ] Copy LICENSE to repo root; set `package.json: "license": "SEE LICENSE IN LICENSE"`
- [ ] Publish Terms + Privacy at `/terms` and `/privacy` (link in footer + signup)
- [ ] Art. 30 GDPR processing records; DPA template ready for Team/Enterprise
- [ ] Cookie banner only if you add analytics (none today — technical cookies only)

## 1. Secrets and config (`/home/dupin/robogarage/.env`, never commit)
```
JWT_SECRET=<openssl rand -hex 32, min 32 chars, rotate yearly>
PUBLIC_URL=https://robogarage.example.com
APP_URL=https://robogarage.example.com
SMTP_HOST=...
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=noreply@robogarage.example.com
```
- [x] No `dev-secret-change-me` in prod; `.env` chmod 600, out of git (`.gitignore`)

## 2. Security hardening (backend is local-grade today)
- [ ] TLS + HSTS (Caddy/Traefik/nginx) — headers already set in `frontend/nginx.conf`; TLS terminator still to add
- [x] Security headers + CORS allowlist (nginx CSP, `CORS_ORIGINS` opt-in)
- [x] Rate limits: login 10/5min/IP, register 10/h, recover 5/15min, import 30/h
- [ ] JWT: 7-day expiry OK; add refresh rotation + logout denylist for Pro+
- [x] Uploads: 2MB avatar cap + **magic-byte** check, anti-traversal, SVG refused (XSS)
- [x] Legacy `POST /api/users/password` requires `ADMIN_TOKEN`; only first password, never takeover
- [ ] Daily `npm audit`, Dependabot, pinned base images (`node:22-alpine`, `nginx:1.27-alpine`)

## 3. Data and scaling
- [ ] SQLite → Postgres when >10k users (only `db.ts` holds user/repo/pull queries)
- [x] `./data/repos` on persistent volume + daily snapshot (`scripts/backup.sh`, cron, 14-day retention)
- [ ] `./data/avatars` → S3-compatible (same sharded keys)
- [x] Backup restore drill: DB + git + avatars (see `scripts/restore.sh`)
- [ ] `docker compose up --scale backend=3` + reverse proxy when needed (stateless Hono is ready)

## 4. Payments (commercial)
- [ ] Stripe: products Free/Pro/Team, webhooks (invoice.paid/failed, customer.subscription.*), entitlements in DB
- [ ] Stripe Connect for marketplace payouts, 20%/15% fee logic, €50 threshold
- [ ] Stripe Tax + e-invoicing; Terms + refund flow wired to support

## 5. Observability
- [x] `/api/health` uptime monitor (`scripts/healthcheck.sh`, systemd user timer every 5 min; restarts stack on failure)
- [ ] `docker logs` shipping (Loki/BetterStack)
- [ ] Alerts: 5xx spike, disk >80%, JWT failures, SMTP failures, queue depth
- [ ] Marketplace cache (`marketplace-cache.json`) invalidate on new commit

## 6. Suggested next features for revenue
1. Team orgs + SSO (closes deals) 2. Private marketplace for companies
3. Eval CI for skills (paid runs) 4. Usage analytics per skill (installs, stars trend)

## 7. Deploy commands (server omarchy-server.local, user dupin)
```bash
cd ~/robogarage
docker compose up -d --build
docker compose ps
docker logs --tail 100 robogarage-backend-1
curl -s http://127.0.0.1:8901/api/health
# public: http://omarchy-server.local:5199
```
Cron/timer (user dupin, `loginctl enable-linger dupin`):
```
systemctl --user list-timers | grep robogarage
systemctl --user start robogarage-backup.service      # backup manuale
systemctl --user start robogarage-healthcheck.service # check manuale
```
Unit: `~/.config/systemd/user/robogarage-{backup,healthcheck}.{service,timer}`.
