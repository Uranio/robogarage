#!/usr/bin/env bash
# Esempio d'uso dei Personal Access Token (PAT) di RoboGarage.
# Richiede: jq, curl, un account su RoboGarage.

set -euo pipefail

BACKEND="${ROBOGARAGE_BACKEND:-https://robogarage-back2.onrender.com}"
USERNAME="${ROBOGARAGE_USER:-tuo-utente}"
PASSWORD="${ROBOGARAGE_PASS:-tua-password}"

echo "== 1. Login (ottieni JWT) =="
JWT=$(curl -s -X POST "$BACKEND/api/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" | jq -r '.token')
echo "JWT ottenuto."

echo "== 2. Crea un Personal Access Token =="
RESP=$(curl -s -X POST "$BACKEND/api/users/tokens" \
  -H "Authorization: Bearer $JWT" \
  -H 'Content-Type: application/json' \
  -d '{"name":"render-deploy","scopes":"repos:write,import:write","expires_in_days":90}')

PAT=$(echo "$RESP" | jq -r '.token')
PREFIX=$(echo "$RESP" | jq -r '.prefix')
echo "Token creato (prefisso: $PREFIX). Salvalo: $PAT"

echo "== 3. Usa il PAT per importare una skill =="
curl -s -X POST "$BACKEND/api/import/paste" \
  -H "Authorization: Bearer $PAT" \
  -H 'Content-Type: application/json' \
  -d '{
    "owner": "'"$USERNAME"'",
    "skill_md": "---\nname: mia-skill\ndescription: Importata via PAT script\n---\n\n# Mia skill\n\nImportata in modo sicuro tramite PAT.\n",
    "visibility": "private"
  }'

echo ""
echo "== 4. Lista i tuoi token =="
curl -s -H "Authorization: Bearer $JWT" "$BACKEND/api/users/tokens" | jq '.'

echo ""
echo "== Fatto. Ricorda: il token si vede solo alla creazione. =="
