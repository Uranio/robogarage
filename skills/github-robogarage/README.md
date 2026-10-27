# github-robogarage

Skill per RoboGarage che raccoglie tutte le informazioni per operare su GitHub e deployare il progetto RoboGarage su Render.

## Cosa contiene

- Comandi git / push / branch per il repo `Uranio/robogarage`
- Deploy frontend (Static Site) e backend (Web Service) su Render
- Variabili d'ambiente: `VITE_API_URL`, `CORS_ORIGINS`, `JWT_SECRET`, ecc.
- Collegamento frontend ↔ backend
- Miglioramenti responsive: hamburger menu, robot in alto, niente elementi fixed

## Installazione

Da una copia locale di RoboGarage:

```bash
cd ~/robogarage
# questa skill si trova in skills/github-robogarage/
```

Oppure importala tramite l'API di RoboGarage:

```bash
curl -s "https://robogarage-back2.onrender.com/api/repos/:id/archive?ref=main" \
  | tar -xz -C ~/.claude/skills/
```

## Licenza

MIT
