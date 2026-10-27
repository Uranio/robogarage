#!/usr/bin/env bash
set -euo pipefail

cd /home/dupin/robogarage

echo "=== Stato git ==="
git status --short
echo ""

echo "=== Ultimo commit ==="
git log --oneline -3
echo ""

echo "=== Remoti ==="
git remote -v
echo ""

echo "=== Build frontend ==="
cd frontend && npm run build 2>&1 | tail -20
cd ..

echo "=== Build backend ==="
cd backend && npm run build 2>&1 | tail -20
cd ..

echo "=== Fatto ==="
