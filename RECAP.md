# 📋 Recap Completo — Progetto RoboGarage

**Ultimo aggiornamento:** 27 ottobre 2026  
**Autore:** Leonardo Martellini  
**Licenza:** MIT  
**Stato:** Online su Render (frontend + backend deployati e funzionanti)

---

## 🎯 Obiettivo del progetto

RoboGarage è una piattaforma per la gestione, condivisione e installazione di **skill, agent e plugin** per sistemi di intelligenza artificiale (Codex, Claude Code, OpenCode/Crush, Pi, Cursor, Gemini). Ogni skill è un vero repository git con SQLite per ricerca, fork, stelle, membri e PR.

---

## 🌐 URL attivi su Render

| Servizio | URL | Stato |
|----------|-----|-------|
| **Frontend** | https://robogarage-2-frontend.onrender.com/ | ✅ Online |
| **Backend** | https://robogarage-back2.onrender.com | ✅ Online |
| **Healthcheck** | https://robogarage-back2.onrender.com/api/health | ✅ Risponde |
| **Pagina Plugin** | https://robogarage-2-frontend.onrender.com/plugins | ✅ Online |
| **Privacy Policy** | https://robogarage-2-frontend.onrender.com/privacy | ✅ Online |
| **Termini di Servizio** | https://robogarage-2-frontend.onrender.com/terms | ✅ Online |

---

## 📂 Repositori GitHub

| Repo | URL | Contenuto |
|------|-----|-----------|
| **Principale** | https://github.com/Uranio/robogarage | Backend Hono, Frontend React/Vite, Docker, documenti legali, skill github-robogarage |
| **Plugin** | https://github.com/Uranio/robogarage-plugin | CLI + adattatori per 6 agent AI |

---

## 🔧 Architettura tecnica

### Backend (Node.js + Hono + SQLite)
- **Lingua:** TypeScript
- **Framework:** Hono
- **Database:** SQLite (better-sqlite3) con WAL mode
- **Porta:** 8901
- **Auth:** JWT HS256 (7 giorni) + Personal Access Token (PAT) con hash scrypt
- **Endpoint principali:**
  - `GET /api/health` — healthcheck
  - `POST /api/login`, `POST /api/users` — registrazione/login
  - `POST /api/users/tokens` — crea PAT (mostrato una volta)
  - `GET /api/users/tokens` — lista token (solo prefisso)
  - `DELETE /api/users/tokens/:id` — revoca token
  - `POST /api/repos` — crea repository skill/agent/plugin
  - `POST /api/import`, `POST /api/import/paste` — importa skill
  - `POST /api/repos/:id/validate` — valida skill/plugin
  - `GET /api/marketplace.json` — marketplace pubblico

### Frontend (React + Vite)
- **Lingua:** TypeScript + React 19
- **Porta:** 5199 (dev), servito da nginx in produzione
- **Pagine:** Landing, Skills, Import, Plugin, Privacy, Terms, Login, Register, Recover, Reset, NewRepo, RepoDetail
- **Responsive:** hamburger menu (≤700px), tabelle con scroll orizzontale, touch target 44px+, nessun elemento `position: fixed`

### Deploy
- **Piattaforma:** Render.com
- **Frontend:** Static Site, root `frontend/`, build `npm run build`, publish `dist`
- **Backend:** Web Service, root `backend/`, build `npm install && npm run build`, start `npm start`
- **Docker:** `docker-compose.yml` disponibile per deploy locale (backend :8901, frontend :5199)
- **Render.yaml:** definizione servizi per deploy su Render

---

## 🔐 Sicurezza

### Personal Access Token (PAT)
- I token vengono hashati con **scrypt** (sale casuale, 64 byte) prima del salvataggio
- Il valore in chiaro viene mostrato **una sola volta** alla creazione
- Ogni token ha **scope** (default: `repos:write,import:write`), eventuale **scadenza** (1-3650 giorni) e può essere **revocato** in qualsiasi momento
- Max 20 token attivi per utente
- Funziona su tutte le rotte di scrittura (`POST /api/repos`, `POST /api/import`, ecc.) come alternativa al JWT

### Altri aspetti di sicurezza
- Rate limit su login (10/5min/IP), register (10/h), recover (5/15min), import (30/h)
- Upload avatar: 2MB max, magic-byte check, anti-traversal, SVG rifiutato
- CORS allowlist configurabile via `CORS_ORIGINS`
- Security headers (CSP, X-Content-Type-Options, X-Frame-Options, ecc.)
- JWT con `JWT_SECRET` obbligatorio in produzione

---

## 🤖 Plugin RoboGarage

**Repo:** https://github.com/Uranio/robogarage-plugin

### Comandi CLI
```
robogarage login --token <PAT> --agent <codex|claude|crush|pi|cursor|gemini>
robogarage list [--query <q>]
robogarage init <nome> [--kind skill|agent|plugin]
robogarage import <owner/skill> [--name <n>] [--visibility public|private]
robogarage validate <owner/skill> [--target <claude|crush|codex|cursor|gemini>]
robogarage publish <cartella> [--name <n>] [--visibility public|private] [--kind skill|agent|plugin]
```

### Directory skill per agent (standard Agent Skills / SKILL.md)

| Agent | Directory | Comando `--agent` |
|-------|-----------|-------------------|
| Codex CLI | `~/.codex/skills/<nome>/SKILL.md` | `codex` |
| Claude Code | `~/.claude/skills/<nome>/SKILL.md` | `claude` |
| Crush / OpenCode | `~/.config/crush/skills/` o `~/.config/agents/skills/` o `~/.agents/skills/` | `crush` |
| Pi coding agent | `~/.agents/skills/` o `~/.pi/agent/skills/` | `pi` |
| Cursor | `~/.cursor/skills/<nome>/SKILL.md` | `cursor` |
| Gemini CLI | `~/.gemini/skills/<nome>/SKILL.md` | `gemini` |

### Esempio di flusso
```bash
robogarage login --token rk_abc123 --agent codex
robogarage init mia-skill --kind skill
robogarage validate leonardo/mia-skill --target claude
robogarage publish ./mia-skill --visibility public --kind skill
robogarage import neo/web-scraper
```

---

## 📄 Documenti legali

| File | Percorso | Contenuto |
|------|----------|-----------|
| Privacy Policy | `PRIVACY_POLICY.md` | GDPR, titolare Leonardo Martellini, diritti utente, sicurezza, conservazione |
| Termini di Servizio | `TERMS_OF_SERVICE.md` | Declino responsabilità ("as is"), copyright, progetto free, legge applicabile |
| LICENSE | `LICENSE` | MIT |
| LICENSE (plugin) | `robogarage-plugin/LICENSE` | MIT |

---

## 📁 Struttura progetto principale

```
/home/dupin/robogarage/
├── backend/              # API Hono + SQLite
│   ├── src/index.ts      # Entry point, CORS, rate limit, middleware auth (JWT + PAT)
│   ├── src/db.ts         # SQLite, DATA_DIR, tabella personal_access_tokens
│   ├── src/auth.ts       # JWT, hashPassword, verifyHash, verifyPat, TokenPayload
│   ├── src/routes/       # users, repos, import, validate, marketplace, tools, tokens
│   └── Dockerfile        # node:22-alpine multi-stage
├── frontend/             # UI React + Vite
│   ├── src/lib/api.ts    # Client API (VITE_API_URL)
│   ├── src/pages/        # Landing, Skills, Import, Plugin, Privacy, Terms, Login, …
│   ├── src/index.css     # Stili + breakpoint responsive (700px, 640px, 480px)
│   └── Dockerfile        # nginx:1.27-alpine
├── robogarage-plugin/    # Plugin per agent AI (repo separato su GitHub)
├── skills/github-robogarage/  # Skill RoboGarage per se stessa
├── docker-compose.yml    # Deploy locale
├── render.yaml           # Deploy su Render
├── PRIVACY_POLICY.md     # Documento legale GDPR
├── TERMS_OF_SERVICE.md   # Documento legale termini
├── LICENSE               # MIT
├── README.md             # Documentazione progetto
├── package.json          # Workspaces [backend, frontend]
└── .env                  # Segreti (mai committato)
```

---

## ✅ Cosa funziona

1. ✅ Frontend online su Render con tutte le pagine
2. ✅ Backend online su Render con API REST completa
3. ✅ Collegamento frontend↔backend via `VITE_API_URL` e `CORS_ORIGINS`
4. ✅ Registrazione/login utente con JWT
5. ✅ Creazione, elenco, eliminazione repository skill/agent/plugin
6. ✅ Import skill da cartella o da SKILL.md incollato
7. ✅ Validazione skill tramite API RoboGarage
8. ✅ Personal Access Token (crea, lista, revoca)
9. ✅ Plugin CLI per 6 agent con installazione skill Agent Skills
10. ✅ Pagine /plugins, /privacy, /terms con link in nav
11. ✅ Responsive mobile (hamburger menu, tabelle scroll, touch target)
12. ✅ Documenti legali GDPR aggiornati con Leonardo Martellini
13. ✅ Repository plugin su GitHub separato

---

## 🚧 Cosa manca / prossimi passi

| Elemento | Stato | Note |
|----------|-------|------|
| Disco persistente su Render | ⚠️ Opzionale | Aggiungere Disk `robogarage-data` su `/data` per persistenza SQLite |
| SMTP email | ⚠️ Configurabile | Variabili `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` |
| Stripe pagamenti | ❌ Non implementato | Piano Free attivo, Pro/Team/Team descritti in BUSINESS_MODEL.md |
| OAuth | ❌ Non implementato | Solo username/password attivo |
| Test backend | ✅ Esistenti | `npm test` (vitest) |
| CI/CD GitHub | ⚠️ Parziale | `.github/workflows/ci.yml` presente |

---

## 🔑 Variabili d'ambiente importanti

### Backend (Render)
```
NODE_ENV=production
PORT=8901
DATA_DIR=/data
JWT_SECRET=<stringa segreta casuale>
PUBLIC_URL=https://robogarage-back2.onrender.com
APP_URL=https://robogarage-2-frontend.onrender.com
CORS_ORIGINS=https://robogarage-2-frontend.onrender.com
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=noreply@...
ADMIN_TOKEN=...
```

### Frontend (Render)
```
VITE_API_URL=https://robogarage-back2.onrender.com
```

---

## ⚠️ Sicurezza - Token

Il token GitHub usato per creare i repository non è mai stato salvato nei file committati. Per sicurezza, non inserire mai PAT o token di alcun tipo in file di configurazione committati su GitHub. Usa variabili d'ambiente o file `.env` locali (aggiunti a `.gitignore`).

---

## 📞 Contatti

**Titolare progetto:** Leonardo Martellini  
**Email privacy:** privacy@robogarage.example.com (sostituire con email reale dell'istanza)  
**Repo principale:** https://github.com/Uranio/robogarage  
**Repo plugin:** https://github.com/Uranio/robogarage-plugin

---

© 2026 Leonardo Martellini. Tutti i diritti riservati. RoboGarage è distribuito sotto licenza MIT.
