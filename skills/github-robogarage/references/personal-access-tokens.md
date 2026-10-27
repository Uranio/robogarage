# Personal Access Token (PAT) — RoboGarage

I PAT permettono di operare su RoboGarage (import skill, creazione repository, commit…) senza usare il JWT di sessione. Ideali per script, CI/CD e deploy automatici.

## Come funziona

1. L'utente effettua il login e ottiene un JWT.
2. Chiama `POST /api/users/tokens` con il JWT per generare un PAT.
3. Il backend restituisce il token in chiaro **una sola volta**.
4. Il token viene hashato con scrypt e salvato; mai memorizzato in chiaro.
5. Il PAT viene passato nell'header `Authorization: Bearer <token>` al posto del JWT.
6. Il token può essere listato (solo prefisso) e revocato in qualsiasi momento.

## Sicurezza

| Misura | Descrizione |
|--------|-------------|
| Hash scrypt | Il token è hashato con scrypt (sale casuale, 64 byte) prima del salvataggio. |
| Mostrato una volta | Il valore in chiaro esce solo nella risposta di `POST /api/users/tokens`. |
| Prefisso identificativo | In lista si vede solo `token_prefix` (prime 8 char, es. `rk_a1b2c3d4`). |
| Scope | Default `repos:write,import:write`; personalizzabile alla creazione. |
| Scadenza | Opzionale, da 1 a 3650 giorni. |
| Revoca | `DELETE /api/users/tokens/:id` disattiva immediatamente il token. |
| Limite | Max 20 token attivi per utente. |
| Lookup per prefisso | La verifica cerca per `token_prefix` prima di eseguire scrypt, evitando costi su tutti i token. |

## Endpoint

Tutti richiedono autenticazione JWT (eccetto l'uso del PAT stesso).

### Creare un token

```
POST /api/users/tokens
Content-Type: application/json
Authorization: Bearer <JWT>

{
  "name": "render-deploy",
  "scopes": "repos:write,import:write",
  "expires_in_days": 90
}
```

Risposta (201):
```json
{
  "id": 7,
  "name": "render-deploy",
  "prefix": "rk_a1b2c3d4",
  "scopes": "repos:write,import:write",
  "expires_at": "2026-11-27T20:00:00.000Z",
  "token": "rk_a1b2c3d4e5f6…<valore in chiaro, 64 char>"
}
```

### Listare i token

```
GET /api/users/tokens
Authorization: Bearer <JWT>
```

Risposta (senza `token` in chiaro):
```json
[
  {
    "id": 7,
    "name": "render-deploy",
    "prefix": "rk_a1b2c3d4",
    "scopes": "repos:write,import:write",
    "expires_at": "2026-11-27T20:00:00.000Z",
    "last_used_at": null,
    "revoked": 0,
    "created_at": "2026-10-27T20:00:00.000Z"
  }
]
```

### Revocare un token

```
DELETE /api/users/tokens/:id
Authorization: Bearer <JWT>
```

Risposta: `{ "ok": true }`

## Esempi pratici

### Importare una skill con il PAT

```bash
PAT="rk_a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890"

curl -s -X POST https://robogarage-back2.onrender.com/api/import/paste \
  -H "Authorization: Bearer $PAT" \
  -H 'Content-Type: application/json' \
  -d '{
    "owner": "tuo-utente",
    "skill_md": "---\nname: mia-skill\ndescription: Importata via PAT\n---\n\n# Mia skill\n\nTesto della skill.\n",
    "visibility": "private"
  }'
```

### Creare un repository con il PAT

```bash
curl -s -X POST https://robogarage-back2.onrender.com/api/repos \
  -H "Authorization: Bearer $PAT" \
  -H 'Content-Type: application/json' \
  -d '{"owner":"tuo-utente","name":"mia-skill","description":"Skill creata via PAT","visibility":"private","kind":"skill"}'
```

## Note per il deploy su Render

Se vuoi che Render (o un altro servizio esterno) importi skill in RoboGarage in automatico:
1. Crea un PAT con scope `import:write` (e `repos:write` se serve creare repo).
2. Metti il valore del PAT come variabile d'ambiente segreta su Render (es. `ROBOGARAGE_PAT`).
3. Nello script di build/deploy di Render, usa `Authorization: Bearer $ROBOGARAGE_PAT` per chiamare le API di RoboGarage.
4. Non mettere mai il PAT in chiaro nel repo Git.
