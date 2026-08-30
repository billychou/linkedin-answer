#!/usr/bin/env bash
# Ping IndexNow (Bing / Yandex / Seznam / Naver / Yep) after new answers publish.
# Usage: scripts/indexnow.sh <game-slug> [<date>]   (date defaults to today, UTC)
#
# IndexNow validates ownership via a public key file served at /<key>.txt
# (see public/1c91269052e09cd422942be6d7de112e.txt). Keep this KEY in sync.
set -euo pipefail

HOST="linkedinanswer.today"
KEY="1c91269052e09cd422942be6d7de112e"

GAME="${1:?usage: indexnow.sh <game-slug> [date]}"
DATE="${2:-$(date -u +%Y-%m-%d)}"

URLS=(
  "https://${HOST}/today"
  "https://${HOST}/games/${GAME}"
  "https://${HOST}/games/${GAME}/${DATE}"
  "https://${HOST}/games/${GAME}/archives"
)

PAYLOAD=$(printf '%s\n' "${URLS[@]}" | jq -R . | jq -s \
  --arg host "$HOST" --arg key "$KEY" \
  '{host:$host, key:$key, keyLocation:("https://" + $host + "/" + $key + ".txt"), urlList:.}')

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "$PAYLOAD")

echo "IndexNow -> ${STATUS} (${#URLS[@]} urls for ${GAME} ${DATE})"
# 200 = accepted, 202 = accepted (validation pending). Anything else is a soft failure.
if [[ "$STATUS" != "200" && "$STATUS" != "202" ]]; then
  echo "WARN: IndexNow returned ${STATUS}" >&2
  exit 1
fi
