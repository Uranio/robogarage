#!/usr/bin/env bash
# Consistent backup of the SQLite DB (WAL included), git repos and avatars.
# Usage: scripts/backup.sh   (cron-friendly; no interactive prompts)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="$BACKUP_DIR/robogarage-$STAMP.tar.gz"
LOG="$BACKUP_DIR/backup.log"

mkdir -p "$BACKUP_DIR"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

log() { echo "$(date -Is) $*" >> "$LOG"; }

if [ ! -f "$ROOT/data/robogarage.db" ]; then
  log "ERROR: $ROOT/data/robogarage.db not found"
  exit 1
fi

mkdir -p "$TMP/payload"

# SQLite online backup: produces a consistent single file even while the
# backend is writing, and folds the WAL into it.
python3 - "$ROOT/data/robogarage.db" "$TMP/payload/robogarage.db" <<'PY'
import sqlite3, sys
src = sqlite3.connect(sys.argv[1])
dst = sqlite3.connect(sys.argv[2])
with dst:
    src.backup(dst)
dst.close()
src.close()
PY

[ -d "$ROOT/data/repos" ] && cp -a "$ROOT/data/repos" "$TMP/payload/repos"
[ -d "$ROOT/data/avatars" ] && cp -a "$ROOT/data/avatars" "$TMP/payload/avatars"

python3 - "$TMP/payload/robogarage.db" <<'PY'
import sqlite3, sys
c = sqlite3.connect(sys.argv[1])
result = c.execute('PRAGMA integrity_check').fetchone()[0]
c.close()
if result != 'ok':
    raise SystemExit(f'integrity_check failed: {result}')
PY

tar czf "$ARCHIVE" -C "$TMP/payload" .
( cd "$BACKUP_DIR" && sha256sum "$(basename "$ARCHIVE")" > "$(basename "$ARCHIVE").sha256" )

SIZE="$(du -h "$ARCHIVE" | cut -f1)"
log "OK $ARCHIVE ($SIZE)"

# Retention: delete archives older than KEEP_DAYS (and their checksums).
find "$BACKUP_DIR" -name 'robogarage-*.tar.gz' -type f -mtime +"$KEEP_DAYS" -print -delete | while read -r old; do
  rm -f "$old.sha256"
  log "pruned $old"
done
