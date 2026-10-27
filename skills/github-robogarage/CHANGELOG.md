# Changelog

## 1.0.0 — 2026-10-27

- Prima versione della skill
- Comandi GitHub per push, branch, remote
- Guida deploy su Render (frontend Static Site, backend Web Service)
- Variabili d'ambiente: `VITE_API_URL`, `CORS_ORIGINS`, `JWT_SECRET`, `DATA_DIR`
- Collegamento frontend ↔ backend su Render
- Responsive: hamburger menu, robot in alto, niente fixed, breakpoint 700px/640px/480px
- Personal Access Token (PAT): POST/GET/DELETE /api/users/tokens, hash scrypt, token mostrato una volta, scope, scadenza, revoca, uso su tutte le rotte di scrittura (import, repos, commit)
- RoboGarage Plugin (robogarage-plugin): CLI + adattatori per Codex, Claude Code, OpenCode/Crush, Pi, Cursor, Gemini; comandi login/list/import/validate/publish/init; validazione automatica prima del publish
- Pagine frontend: /plugins (istruzioni installazione con API reale), /privacy (GDPR), /terms (declino responsabilità)
- Documenti legali aggiornati: Leonardo Martellini, copyright, GDPR, progetto free
