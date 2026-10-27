# Struttura progetto RoboGarage

```
robogarage/
├── backend/
│   ├── src/
│   │   ├── index.ts      # entry, CORS, rate limit, healthcheck /api/health
│   │   ├── db.ts         # SQLite (better-sqlite3), DATA_DIR
│   │   ├── auth.ts, validators.ts
│   │   └── routes/
│   ├── package.json      # start: node dist/index.js
│   ├── Dockerfile        # node:22-alpine multi-stage
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── lib/api.ts            # base URL (VITE_API_URL)
│   │   ├── components/TermLayout.tsx   # topbar, hamburger menu
│   │   ├── pages/                # Landing, Skills, Login, Register, RepoDetail...
│   │   └── index.css             # stili + breakpoint responsive
│   ├── package.json       # build: tsc && vite build
│   ├── vite.config.ts     # dev :5199, proxy /api → :8901
│   └── nginx.conf         # solo per Docker
├── docker-compose.yml     # backend :8901, frontend :5199
├── render.yaml            # definizione servizi Render
├── .env                   # segreti (no commit)
└── package.json           # workspaces [backend, frontend]
```

URL attuali su Render:
- Frontend: `https://robogarage-2-frontend.onrender.com`
- Backend: `https://robogarage-back2.onrender.com`
