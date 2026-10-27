# Deploy su Render — RoboGarage

Due servizi separati: **Frontend** (Static Site) e **Backend** (Web Service).

## Frontend — Static Site

| Campo | Valore |
|-------|--------|
| Environment | `static` |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Publish Directory | `dist` |
| Start Command | *(vuoto)* |

Variabile:
- `VITE_API_URL` = `https://robogarage-back2.onrender.com`

## Backend — Web Service

| Campo | Valore |
|-------|--------|
| Environment | `Node` |
| Root Directory | `backend` |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |

Variabili:
- `NODE_ENV=production`
- `DATA_DIR=/data` (se aggiungi un Disk persistente)
- `JWT_SECRET=...`
- `PUBLIC_URL=https://robogarage-back2.onrender.com`
- `APP_URL=https://robogarage-2-frontend.onrender.com`
- `CORS_ORIGINS=https://robogarage-2-frontend.onrender.com` (obbligatorio)

## Disco persistente (consigliato)

Aggiungi un Disk `robogarage-data` montato su `/data` nel backend. Altrimenti SQLite si resetta a ogni deploy.

## Verifica

```bash
curl -s https://robogarage-back2.onrender.com/api/health
# atteso: {"ok":true,"time":"..."}
```
