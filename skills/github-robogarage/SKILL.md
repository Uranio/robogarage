---
name: github-robogarage
description: Operazioni GitHub e deploy del progetto RoboGarage (frontend + backend su Render)
version: 1.0.0
author: dupin
license: MIT
compatibility: opencode, claude, codex
tools: [read, write, edit, bash]
---

# RoboGarage — GitHub & Deploy Skill

Questa skill raccoglie tutte le informazioni necessarie per operare sul progetto **RoboGarage** tramite GitHub e Render: comandi git/push, struttura del progetto, collegamento frontend–backend, variabili d'ambiente, deploy su Render e migliorie lato mobile (menu hamburger).

---

## 1. Progetto in sintesi

**RoboGarage** è una piattaforma per skill, agent e plugin (stile "garage per robot").
- **Frontend**: React + Vite, TypeScript, porta `5199` in dev.
- **Backend**: Hono (Node.js) + SQLite, porta `8901` in dev.
- **Comunicazione**: il frontend chiama il backend tramite `/api/*`. In produzione il frontend è una Static Site su Render, il backend è un Web Service su Render.
- **Repo GitHub**: `https://github.com/Uranio/robogarage`

---

## 2. Struttura del repository

```
/home/dupin/robogarage/
├── backend/               # API Hono + SQLite
│   ├── src/
│   │   ├── index.ts       # entry point, CORS, rate limit, healthcheck
│   │   ├── db.ts          # SQLite (better-sqlite3), DATA_DIR
│   │   ├── auth.ts, validators.ts, routes/
│   │   └── ...
│   ├── package.json       # start: node dist/index.js
│   ├── Dockerfile         # multi-stage build (node:22-alpine)
│   └── tsconfig.json
├── frontend/              # UI React + Vite
│   ├── src/
│   │   ├── lib/api.ts     # base URL per chiamate API (VITE_API_URL)
│   │   ├── components/TermLayout.tsx   # topbar + hamburger menu
│   │   ├── pages/         # Landing, Skills, Login, Register, RepoDetail, …
│   │   └── index.css      # stili + breakpoint responsive
│   ├── index.html
│   ├── package.json       # build: tsc && vite build
│   ├── vite.config.ts     # dev server :5199, proxy /api → :8901
│   └── nginx.conf         # (solo Docker)
├── docker-compose.yml     # backend :8901 + frontend :5199
├── render.yaml            # definizione servizi Render
├── .env                   # segreti (mai commitare)
├── package.json           # workspaces [backend, frontend]
└── README.md
```

---

## 3. Comandi GitHub essenziali

Eseguiti da `/home/dupin/robogarage`:

```bash
# Stato del repo
git status

# Vedere i remoti configurati
git remote -v

# Aggiungere il remoto (se mancante)
git remote add origin https://github.com/Uranio/robogarage.git

# Cambiare branch
git checkout main
git checkout -b nome-nuova-branch

# Aggiornare il locale da remoto
git pull origin main

# Aggiungere tutti i file modificati
git add .

# Commit
git commit -m "messaggio descrittivo"

# Pushto su GitHub
git push origin main
git push origin nome-nuova-branch

# Forzare push (solo se necessario e consapevoli)
git push --force origin nome-nuova-branch
```

### Flusso tipico per una modifica al frontend

```bash
cd /home/dupin/robogarage
git checkout main
git pull origin main
# modifica file in frontend/src/…
git add frontend/src/…
git commit -m "feat: descrizione modifica"
git push origin main
# poi ridèployare il servizio frontend su Render
```

---

## 4. Deploy su Render

Il progetto usa due servizi separati su Render.

### 4.1 Frontend (Static Site)

| Parametro | Valore |
|-----------|--------|
| Environment | `static` |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Publish Directory | `dist` |
| Start Command | *(vuoto)* |
| Node Version | 24 (default Render) |

**Variabili d'ambiente frontend:**

| Chiave | Valore esempio | Note |
|--------|----------------|------|
| `VITE_API_URL` | `https://robogarage-back2.onrender.com` | URL pubblico del backend |

Dopo ogni push su `main`, Render rebuilda automaticamente (se il servizio è collegato al repo GitHub).

### 4.2 Backend (Web Service)

| Parametro | Valore |
|-----------|--------|
| Environment | `Node` |
| Root Directory | `backend` |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Runtime | Node |

**Variabili d'ambiente backend:**

| Chiave | Valore esempio | Note |
|--------|----------------|------|
| `NODE_ENV` | `production` | |
| `PORT` | *(Render imposta automaticamente)* | |
| `DATA_DIR` | `/data` | se aggiungi un Disk persistente |
| `JWT_SECRET` | `openssl rand -hex 32` | segreto per i token |
| `PUBLIC_URL` | `https://robogarage-back2.onrender.com` | |
| `APP_URL` | `https://robogarage-2-frontend.onrender.com` | |
| `CORS_ORIGINS` | `https://robogarage-2-frontend.onrender.com` | **obbligatorio**, altrimenti il browser blocca le chiamate CORS |
| `SMTP_HOST` | `…` | opzionale, per email |
| `SMTP_PORT` | `587` | |
| `SMTP_USER` | `…` | |
| `SMTP_PASS` | `…` | |
| `SMTP_FROM` | `noreply@…` | |
| `ADMIN_TOKEN` | `…` | opzionale, legacy bootstrap password |

### 4.3 Disco persistente (consigliato per il backend)

Il backend salva SQLite in `DATA_DIR`. Su Render, senza un **Disk**, i dati si resettano a ogni deploy.

1. Nel servizio backend su Render, aggiungi un **Disk** chiamato `robogarage-data`.
2. Mount path: `/data`.
3. Imposta `DATA_DIR=/data` nelle variabili d'ambiente.

---

## 5. Collegare frontend e backend

### 5.1 Modifica al frontend (una tantum)

In `frontend/src/lib/api.ts`, la base URL deve puntare al backend in produzione:

```ts
const base = import.meta.env.VITE_API_URL || '';
```

Senza questa riga, il frontend chiama URL relativi e non trova l'API su Render.

### 5.2 Variabili incrociate

- Sul **frontend**: `VITE_API_URL` = URL del backend.
- Sul **backend**: `CORS_ORIGINS` = URL del frontend.

Esempio con gli URL attuali del progetto:

```
Frontend:  https://robogarage-2-frontend.onrender.com
Backend:   https://robogarage-back2.onrender.com

VITE_API_URL  = https://robogarage-back2.onrender.com
CORS_ORIGINS  = https://robogarage-2-frontend.onrender.com
```

### 5.3 Ordine operativo

1. Pusho le modifiche sul repo GitHub.
2. Ridèployo il **frontend** (per recepire `VITE_API_URL` e nuovi file).
3. Ridèployo il **backend** (per recepire `CORS_ORIGINS`).
4. Verifico aprendo il frontend e provando login/registrazione.
5. Se c'è errore CORS o 404, controllo le variabili e la console del browser (F12).

---

## 6. Mobile & Responsive (stato attuale)

Il frontend è stato reso responsive con le seguenti modifiche:

- **Hamburger menu**: bottone `☰` in alto a sinistra, accanto al logo `robogarage _`. Su desktop è nascosto; su mobile (≤ 700px) appare e apre un overlay slide-in da destra con link nav, utente, logout, selezione tema.
- **Topbar**: non è più `position: sticky`; scorre normalmente.
- **Scanline**: rimosso `position: fixed` (non blocca più lo scroll).
- **Tabelle**: scroll orizzontale su schermi piccoli (Skills, RepoDetail).
- **Input**: `font-size: 16px` su mobile per evitare lo zoom accidentale su iOS.
- **Touch target**: pulsanti almeno `44px` (o `48px` su schermi molto piccoli).
- **Robot danzante**: spostato in cima alla Landing page, subito dopo titolo e sottotitolo.
- **Grid**: `.grid2` collassa a una colonna su mobile.

Breakpoint CSS definiti in `frontend/src/index.css`:
- `max-width: 700px` → menu hamburger attivo, topbar compatta.
- `max-width: 640px` → adattamenti generali (font, padding, tabelle).
- `max-width: 480px` → affinamenti estremi (textarea, robot più piccolo, bottoni più grandi).

---

## 7. Script utili

### Script di deploy rapido (locale)

Salva come `scripts/deploy-check.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

cd /home/dupin/robogarage

echo "=== Stato git ==="
git status --short
echo ""

echo "=== Ultimo commit ==="
git log --oneline -3
echo ""

echo "=== Remoti ==="
git remote -v
echo ""

echo "=== Build frontend (dry) ==="
cd frontend && npm run build 2>&1 | tail -20
cd ..

echo "=== Build backend (dry) ==="
cd backend && npm run build 2>&1 | tail -20
cd ..

echo "=== Fatto ==="
```

Rendilo eseguibile:

```bash
chmod +x scripts/deploy-check.sh
./scripts/deploy-check.sh
```

---

## 8. Esempi

### Esempio di input (SKILL.md da importare)

Vedi `examples/input.md`.

### Esempio di output atteso

Vedi `examples/expected.md`.

---

## 9. Test

Vedi `tests/skill.test.js`.

---

## 10. Changelog

- `1.0.0` — Prima versione: comandi GitHub, deploy Render, collegamento frontend/backend, responsive e hamburger menu.

---

## 11. Riferimenti interni

- `references/github-commands.md` — comandi git dettagliati.
- `references/render-deploy.md` — deploy passo-passo su Render.
- `references/frontend-backend-connection.md` — collegamento CORS e VITE_API_URL.
- `references/project-structure.md` — mappa file del progetto.

---

## Come installare questa skill

Da terminale, dentro una copia locale di RoboGarage:

```bash
# Se hai già il repo clonato
cd ~/robogarage
git pull origin main

# Oppure, per importare questa skill da un'altra istanza RoboGarage:
# curl -s "https://robogarage-back2.onrender.com/api/repos/:id/archive?ref=main" | tar -xz -C ~/.claude/skills/
```

Sostituisci `:id` con l'ID numerico del repo nella tua istanza RoboGarage.
