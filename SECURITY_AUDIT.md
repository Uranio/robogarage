# 🔐 Security Audit — RoboGarage

**Data:** 27 ottobre 2026  
**Progetto:** RoboGarage  
**Autore:** Leonardo Martellini  
**Stato:** ✅ Nessun segreto hardcodato trovato  
**Versione:** 1.0.0

---

## 1. Riepilogo esecutivo

L'audit di sicurezza non ha trovato **segreti hardcodati** (token, chiavi API, password, JWT secret) nei file committati sul repository GitHub. Il file `.env` contenente i segreti di produzione è correttamente escluso dal versioning tramite `.gitignore`.

Tuttavia, ci sono diverse aree che richiedono attenzione prima del deploy in produzione pubblica.

---

## 2. Gestione segreti e variabili d'ambiente

### ✅ Cosa è corretto

| Elemento | Stato | Note |
|----------|-------|------|
| `.env` | Escluso da git | In `.gitignore` |
| `.env.example` | Tracciato | Contiene solo placeholder, nessun valore reale |
| `JWT_SECRET` | Non hardcodato | Deve essere impostato come env var su Render |
| Token GitHub (PAT) | Non nel codice | Usato solo in memoria per il push, mai committato |
| PAT RoboGarage | Non hardcodato | Generato a runtime, hashato con scrypt |

### ⚠️ Cosa richiede attenzione

| Elemento | Rischio | Azione richiesta |
|----------|---------|------------------|
| `JWT_SECRET` su Render | Se non impostato, usa default `dev-secret-change-me` | Impostare variabile d'ambiente su Render prima del go-live |
| `.env` locale | Se qualcuno lo committa per errore | Verificare `.gitignore` prima di ogni commit |
| Variabili SMTP | Credenziali email in `.env` | Non committare mai, usare env vars su Render |

---

## 3. Autenticazione e autorizzazione

### JWT (JSON Web Token)

| Aspetto | Implementazione | Stato |
|---------|----------------|-------|
| Algoritmo | HS256 | ✅ Adeguato per uso interno |
| Segreto | `JWT_SECRET` env var | ⚠️ Deve essere lungo e casuale in produzione |
| Scadenza | 7 giorni | ✅ Accettabile |
| Memorizzazione | Solo nel browser (localStorage/memoria) | ✅ Non inviato al server se non nelle header |
| Statale | Stateless, verificabile da qualsiasi replica | ✅ Buon design per scalabilità |

### Personal Access Token (PAT)

| Aspetto | Implementazione | Stato |
|---------|----------------|-------|
| Generazione | `rk_` + 32 byte esadecimali (64 char) | ✅ Sufficientemente lungo |
| Archivio | Hashato con scrypt (sale casuale, 64 byte) | ✅ Password non memorizzata in chiaro |
| Visualizzazione | Mostrata una sola volta alla creazione | ✅ Buona pratica |
| Revoca | `DELETE /api/users/tokens/:id` | ✅ Implementato |
| Lookup | Per prefisso (prime 8 char) + verify constant-time | ✅ Evita timing attack |
| Limite | Max 20 token attivi per utente | ✅ Previene esaurimento risorse |
| Scope | Personalizzabili (default `repos:write,import:write`) | ✅ Buona pratica |
| Scadenza | Opzionale, 1-3650 giorni | ✅ Flessibile |

### Autorizzazione

| Endpoint | Controllo | Stato |
|----------|-----------|-------|
| Letture pubbliche | Nessun auth richiesto | ✅ Intentionale |
| Scritture | JWT o PAT richiesto | ✅ Middleware `/api/*` |
| Repo privati | 404 per estranei (no leak di esistenza) | ✅ Buona pratica |
| Scrittura repo | Solo owner/collaboratori | ✅ `canWrite()` checks |
| Collaboratori | Solo owner può gestire | ✅ Controllato |
| Avatar upload | Solo proprietario dell'account | ✅ Controllato |

---

## 4. Validazione input e prevenzione attacchi comuni

### SQL Injection

| Componente | Implementazione | Stato |
|------------|----------------|-------|
| Database | SQLite con `better-sqlite3` | ✅ Prepared statements ovunque |
| Query dinamiche | Nessuna concatenazione stringhe | ✅ Tutti i parametri sono binding |

### Path Traversal

| Componente | Implementazione | Stato |
|------------|----------------|-------|
| Import path | `assertImportPath()` con allowlist `IMPORT_ROOTS` | ✅ Restrittivo |
| Repo path | `assertRepoPath()` rifiuta `../`, `.git/`, path assoluti | ✅ Sicuro |
| Blob/Tree | `assertRef()` e `assertRepoPath()` sui parametri | ✅ Sicuro |
| Avatar | Salvataggio con nome hashato, nessun path utente diretto | ✅ Sicuro |

### XSS (Cross-Site Scripting)

| Componente | Implementazione | Stato |
|------------|----------------|-------|
| Content Security Policy | `default-src 'self'` con eccezioni minime | ✅ Buona |
| X-Content-Type-Options | `nosniff` | ✅ Presente |
| X-Frame-Options | `DENY` | ✅ Presente |
| Referrer-Policy | `strict-origin-when-cross-origin` | ✅ Presente |
| Input utente | Renderizzato come testo React (auto-escapato) | ✅ React protegge di default |
| Avatar SVG | Rifiutato esplicitamente | ✅ Previene XSS via SVG |

### Rate Limiting

| Endpoint | Limite | Stato |
|----------|--------|-------|
| Login | 10 richieste / 5 min per IP | ✅ |
| Register | 10 richieste / ora | ✅ |
| Recover password | 5 richieste / 15 min | ✅ |
| Reset password | 10 richieste / 15 min | ✅ |
| Import | 30 richieste / ora | ✅ |
| Bootstrap password | 5 richieste / ora | ✅ |

### Upload file (Avatar)

| Controllo | Implementazione | Stato |
|-----------|----------------|-------|
| Dimensione massima | 2 MB | ✅ |
| Tipo file | Solo immagini (magic-byte check) | ✅ |
| Traversal | Nome file generato, non nome utente | ✅ |
| SVG | Rifiutato esplicitamente | ✅ |
| Cache | Nome immutabile con token casuale | ✅ |

---

## 5. Comunicazione e rete

### CORS

| Aspetto | Implementazione | Stato |
|---------|----------------|-------|
| Default | Nessun header CORS (stesso origine) | ✅ Sicuro per uso locale |
| Opt-in | `CORS_ORIGINS` env var (comma separated, exact match) | ✅ Nessun wildcard `*` |
| Preflight | `OPTIONS` gestito con 204 | ✅ |

### TLS/HTTPS

| Aspetto | Stato | Nota |
|---------|-------|------|
| Render | TLS automatico | ✅ Render gestisce il certificato |
| HSTS | Da configurare sul reverse proxy | ⚠️ Da aggiungere in produzione |
| Docker locale | Nessun TLS (localhost) | ✅ Accettabile per dev |

---

## 6. Archiviazione dati

### Database (SQLite)

| Aspetto | Stato | Nota |
|---------|-------|------|
| File | `./data/robogarage.db` | ✅ |
| WAL mode | Attivato | ✅ Migliore concorrenza |
| Backup | `scripts/backup.sh` (online, 14 giorni retention) | ✅ |
| Restore | `scripts/restore.sh` con checksum | ✅ |
| Persistenza su Render | ⚠️ Richiede Disk persistente | Altrimenti si resetta a ogni deploy |

### File system

| Aspetto | Stato | Nota |
|---------|-------|------|
| Repos | `./data/repos/<owner>/<name>.git-work/` | ✅ |
| Avatars | `./data/avatars/<aa>/<bb>/` (sharded) | ✅ Previene problemi filesystem |
| Data dir | Configurabile via `DATA_DIR` | ✅ |

---

## 7. Dipendenze e supply chain

### Vulnerabilità note (output `npm audit`)

```
7 vulnerabilities (3 moderate, 2 high, 2 critical)
```

Queste vulnerabilità sono nelle dipendenze di `node_modules` (frontend e backend). Non sono state analizzate in dettaglio in questo audit.

**Azione consigliata:** Eseguire `npm audit` e `npm audit fix` dove possibile, valutare se le vulnerabilità critiche riguardano codice eseguito in produzione o solo tool di build.

---

## 8. Errori trovati e già fixati

Durante l'audit sono stati corretti i seguenti errori di implementazione:

| Errore | File | Fix applicato |
|--------|------|---------------|
| `c.req.json({})` argomento non valido | `backend/src/routes/tokens.ts` | Rimosso l'argomento `{}` |
| `req<Type>()` type argument non supportato | `frontend/src/lib/api.ts` | Sostituito con cast `as Promise<Type>` |
| `<IL_TUO_TOKEN>` interpretato come tag JSX | `frontend/src/pages/Plugins.tsx` | Sostituito con `IL_TUO_TOKEN` |
| `TokenPayload` mancante di `pat` e `iat`/`exp` | `backend/src/auth.ts`, `backend/src/index.ts` | Aggiunti campi |

---

## 9. Raccomandazioni per la produzione

### Priorità alta

1. **Impostare `JWT_SECRET` su Render** con un valore lungo e casuale (es. `openssl rand -hex 32`)
2. **Aggiungere Disco persistente** su Render per il backend (`/data`) per non perdere i dati a ogni deploy
3. **Configurare `CORS_ORIGINS`** esattamente con l'URL del frontend (senza wildcard)
4. **Aggiungere HSTS** sul reverse proxy (Caddy/Traefik/nginx) davanti al backend
5. **Eseguire `npm audit fix`** e valutare le vulnerabilità critiche

### Priorità media

6. **Implementare refresh token rotation** per JWT (attualmente solo access token a 7 giorni)
7. **Aggiungere denylist per JWT revocati** (logout immediato)
8. **Implementare 2FA** per account sensibili
9. **Aggiungere logging di sicurezza** (tentativi di accesso falliti, modifiche token)
10. **Rate limit più granulari** per endpoint di scrittura

### Priorità bassa

11. **Content Security Policy più restrittiva** (rimuovere `'unsafe-inline'` se possibile)
12. **Implementare CSRF protection** per azioni di stato cambiante
13. **Aggiungere WAF** (Web Application Firewall) davanti al servizio pubblico

---

## 10. Checklist pre-go-live

- [ ] `JWT_SECRET` impostato su Render (non default)
- `CORS_ORIGINS` impostato con URL frontend esatto
- Disco persistente `/data` configurato sul backend
- SMTP configurato (o accettare che i link di reset vengano stampati nei log)
- `npm audit` eseguito e vulnerabilità critiche valutate
- Backup di prova effettuato (`scripts/restore.sh --yes` con archivio di test)
- Documenti legali (Privacy, Terms) pubblicati e linkati nel footer

---

## 11. Cosa NON è nel repository (per sicurezza)

- ❌ Nessun `.env` con valori reali
- ❌ Nessun token GitHub (`ghp_...`)
- ❌ Nessuna chiave API AWS/Stripe/SendGrid
- ❌ Nessun `JWT_SECRET` in chiaro
- ❌ Nessun PAT RoboGarage (`rk_...`) reale
- ✅ Solo placeholder esemplificativi (`rk_abc123`, `dev-secret-change-me`)

---

© 2026 Leonardo Martellini. RoboGarage — progetto free, licenza MIT.
