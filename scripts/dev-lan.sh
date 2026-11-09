#!/usr/bin/env bash
# Runs the API (:3003) and the web app (:3001) so a phone on the same network
# can open them. Run it again after changing network: the address is in the
# auth URLs and cookies, so the servers have to start again with the new one.
# Usage: scripts/dev-lan.sh [ip]   (defaults to this machine's address on the network)
set -euo pipefail
cd "$(dirname "$0")/.."

IP=${1:-$(ip -4 route get 1.1.1.1 | awk '{for (i = 1; i <= NF; i++) if ($i == "src") print $(i + 1)}')}
echo "Starting on http://$IP:3001"

fuser -k 3001/tcp 3003/tcp 2>/dev/null || true

# The API checks Stripe's webhook signatures even when nothing forwards them.
SECRET_KEY=$(grep -E '^STRIPE_SECRET_KEY=' api/.env | cut -d= -f2- | tr -d '"') || true
[ -n "$SECRET_KEY" ] || { echo "STRIPE_SECRET_KEY is missing from api/.env" >&2; exit 1; }
WEBHOOK_SECRET=$(stripe listen --print-secret --api-key "$SECRET_KEY") ||
  { echo "The Stripe CLI couldn't give a webhook secret, is it installed?" >&2; exit 1; }

# Pages built for the old address reload in a loop otherwise.
rm -rf web/.next/dev

(cd api && WEB_URL="http://$IP:3001" BETTER_AUTH_URL="http://$IP:3003" S3_ENDPOINT="http://$IP:9090" \
  STRIPE_WEBHOOK_SECRET="$WEBHOOK_SECRET" pnpm start:dev) &
(cd web && DEV_HOST="$IP" NEXT_PUBLIC_API_URL="http://$IP:3003" S3_ENDPOINT="http://$IP:9090" pnpm dev) &
wait
