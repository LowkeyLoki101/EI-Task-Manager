#!/usr/bin/env bash
# Quick local test: posts a sample action to your running Replit server.
# Usage: bash scripts/post_test.sh https://<your-repl>.repl.co voice-action "create_note" "Test note" you@example.com
set -euo pipefail

BASE_URL="${1:-https://example.repl.co}"
PATH_SEG="${2:-voice-action}"
ACTION="${3:-create_note}"
DETAILS="${4:-Hello from curl}"
EMAIL="${5:-you@example.com}"

if [[ -z "${ELEVEN_SHARED_TOKEN:-}" ]]; then
  echo "Please export ELEVEN_SHARED_TOKEN in your environment (same as your server uses)."
  exit 1
fi

curl -sS -X POST "$BASE_URL/$PATH_SEG"     -H "Content-Type: application/json"     -H "Authorization: Bearer $ELEVEN_SHARED_TOKEN"     -d "{"action":"$ACTION","details":"$DETAILS","userEmail":"$EMAIL"}" | jq .
