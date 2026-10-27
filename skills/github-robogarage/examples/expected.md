# Esempio di output atteso

1. `cd /home/dupin/robogarage`
2. `git add frontend/src/lib/api.ts`
3. `git commit -m "feat: use VITE_API_URL for backend"`
4. `git push origin main`
5. Su Render: impostare `VITE_API_URL` sul frontend e `CORS_ORIGINS` sul backend, poi ridèployare entrambi.
