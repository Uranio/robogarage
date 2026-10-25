#!/usr/bin/env bash
# Cheap liveness check used by cron: frontend + API. Restarts the stack once
# if either is unhealthy; logs every failure.
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="$ROOT/backups/health.log"
BASE="${HEALTH_BASE:-http://127.0.0.1:5199}"

check() { curl -fsS --max-time 5 "$1" >/dev/null 2>&1; }

if check "$BASE/" && check "$BASE/api/health"; then
  exit 0
fi

mkdir -p "$ROOT/backups"
echo "$(date -Is) unhealthy: $BASE/" >> "$LOG"

cd "$ROOT" || exit 1
docker compose up -d >> "$LOG" 2>&1

# Give it a moment, then record the outcome.
sleep 10
if check "$BASE/" && check "$BASE/api/health"; then
  echo "$(date -Is) recovered after restart" >> "$LOG"
else
  echo "$(date -Is) STILL DOWN after restart" >> "$LOG"
  exit 1
fi
