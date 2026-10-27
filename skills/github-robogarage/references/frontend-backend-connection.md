# Collegamento frontend ↔ backend

## 1. Modifica `api.ts`

File: `frontend/src/lib/api.ts`

```ts
const base = import.meta.env.VITE_API_URL || '';
```

## 2. Variabili d'ambiente

Servizio **frontend** su Render:
- `VITE_API_URL` = `https://robogarage-back2.onrender.com`

Servizio **backend** su Render:
- `CORS_ORIGINS` = `https://robogarage-2-frontend.onrender.com`

Senza `CORS_ORIGINS`, il browser blocca le chiamate cross-origin (errore CORS).

## 3. Ordine operativo

1. Pusho modifiche su GitHub.
2. Ridèployo frontend.
3. Ridèployo backend.
4. Apro il frontend e provo login/registrazione.
5. Controllo console browser (F12) per errori CORS o 404.

## 4. Healthcheck backend

```bash
curl -s https://robogarage-back2.onrender.com/api/health
```
