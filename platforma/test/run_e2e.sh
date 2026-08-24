#!/usr/bin/env bash
# Paneli uçdan-uca yoxlayir: temiz baza + mock Supabase + Chromium.
# Lazimdir: postgres isleyir, playwright ve psycopg2-binary qurulub.
set -euo pipefail
cd "$(dirname "$0")/.."

export PGHOST=${PGHOST:-/tmp} PGPORT=${PGPORT:-55432} PGUSER=${PGUSER:-postgres}
DB=${DB:-panel_e2e}
API_PORT=${API_PORT:-54321}
WEB_PORT=${WEB_PORT:-8010}

cleanup() { [ -n "${MOCK_PID:-}" ] && kill "$MOCK_PID" 2>/dev/null || true
            [ -n "${WEB_PID:-}"  ] && kill "$WEB_PID"  2>/dev/null || true; }
trap cleanup EXIT

echo "1/4  temiz baza: $DB"
dropdb --if-exists "$DB" >/dev/null 2>&1 || true
createdb "$DB"
( cd db && ./run.sh "$DB" --local ) 2>&1 | grep -vi notice || true

echo "2/4  mock supabase :$API_PORT"
MOCK_DSN="host=$PGHOST port=$PGPORT user=$PGUSER dbname=$DB" \
  python3 test/mock_supabase.py "$API_PORT" >/dev/null 2>&1 &
MOCK_PID=$!

echo "3/4  statik server :$WEB_PORT"
python3 -m http.server "$WEB_PORT" >/dev/null 2>&1 &
WEB_PID=$!
sleep 2

echo "4/4  brauzer yoxlamasi"
python3 test/e2e_panel.py
