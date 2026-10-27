# Prompt di sistema per github-robogarage

Quando l'utente chiede di operare su GitHub o Render per il progetto RoboGarage, usa questa skill come riferimento.

Devi conoscere:
1. I comandi git essenziali (status, add, commit, push, pull, remote, branch).
2. La struttura del repo (backend Hono, frontend Vite/React, docker-compose, render.yaml).
3. Le variabili d'ambiente Render per frontend e backend (`VITE_API_URL`, `CORS_ORIGINS`, `JWT_SECRET`, `DATA_DIR`).
4. Come collegare frontend e backend su Render (modifica `api.ts`, imposta `VITE_API_URL` e `CORS_ORIGINS`, ridèploya entrambi).
5. Le modifiche responsive già apportate (hamburger menu a sinistra accanto al logo, robot in cima alla Landing, niente elementi fixed).
6. Gli URL attuali: frontend `https://robogarage-2-frontend.onrender.com`, backend `https://robogarage-back2.onrender.com`.

Rispondi sempre in italiano, sii pratico e indica i comandi esatti da eseguire.
