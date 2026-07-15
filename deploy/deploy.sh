#!/usr/bin/env bash
# FieldCompliance — deploy latest main to the droplet
#
# Runs as the `fc` user from ~/fieldcompliance
# Idempotent: safe to re-run any time
#
# Usage:
#   cd ~/fieldcompliance && ./deploy/deploy.sh

set -euo pipefail

cd "$(dirname "$0")/.."   # repo root

echo "→ Pulling latest…"
git fetch --quiet
git reset --hard origin/main

echo "→ Installing dependencies…"
# We install devDeps because we need @nestjs/cli + typescript to build.
# The runtime container only reads from dist/ so this doesn't bloat prod memory.
npm ci --silent

echo "→ Generating Prisma client…"
npx prisma generate >/dev/null 2>&1

echo "→ Pushing schema changes to database…"
# For MVP we use db push. Once you have real customer data, switch to
# `npx prisma migrate deploy` and check migrations into git.
npx prisma db push --skip-generate

echo "→ Building NestJS…"
npm run build

echo "→ Restarting PM2 process…"
if pm2 describe fc-api >/dev/null 2>&1; then
  pm2 reload ecosystem.config.js --update-env
else
  # First-time deploy — process doesn't exist yet
  pm2 start ecosystem.config.js
  pm2 save
fi

echo ""
echo "→ Waiting for health check…"
sleep 3
if curl -sf http://localhost:3001/api/v1/health >/dev/null; then
  echo "✓ Deploy complete. API is healthy."
else
  echo "✗ Deploy finished but health check failed."
  echo "  Check logs: pm2 logs fc-api"
  exit 1
fi
