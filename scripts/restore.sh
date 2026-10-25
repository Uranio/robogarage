#!/usr/bin/env bash
# Restore a backup archive. Destructive: requires --yes and confirmation.
# Usage: scripts/restore.sh backups/robogarage-YYYYmmdd-HHMMSS.tar.gz --yes
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARCHIVE="${1:-}"
CONFIRM="${2:-}"

if [ -z "$ARCHIVE" ] || [ ! -f "$ARCHIVE" ]; then
  echo "usage: $0 <archive.tar.gz> --yes" >&2
  exit 1
fi
if [ "$CONFIRM" != "--yes" ]; then
  echo "This will REPLACE $ROOT/data with the contents of $ARCHIVE." >&2
  echo "Stop the stack first, then re-run with --yes." >&2
  exit 1
fi

if [ -f "$ARCHIVE.sha256" ]; then
  (cd "$(dirname "$ARCHIVE")" && sha256sum -c "$(basename "$ARCHIVE").sha256")
fi

echo "→ stopping backend"
( cd "$ROOT" && docker compose stop backend )

STAMP="$(date +%Y%m%d-%H%M%S)"
SAFETY="$ROOT/backups/pre-restore-$STAMP.tar.gz"
mkdir -p "$ROOT/backups"
echo "→ safety snapshot: $SAFETY"
tar czf "$SAFETY" -C "$ROOT/data" .

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
tar xzf "$ARCHIVE" -C "$TMP"

rm -rf "$ROOT/data"
mkdir -p "$ROOT/data"
cp -a "$TMP/." "$ROOT/data/"
if id -u dupin >/dev/null 2>&1; then
  chown -R 1000:1000 "$ROOT/data"
fi

echo "→ starting backend"
( cd "$ROOT" && docker compose up -d backend )
echo "✓ restored $ARCHIVE (safety snapshot: $SAFETY)"
