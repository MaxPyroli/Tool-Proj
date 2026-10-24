#!/bin/sh
# Teste supabase/schema.sql (règles d'accès, triggers) sur un Postgres local.
# Usage : DATABASE_URL=postgres://postgres@localhost:5432/postgres npm run test:db
# (crée puis supprime une base temporaire « tool_proj_test »)
set -e
export PGOPTIONS="-c client_min_messages=error"
URL="${DATABASE_URL:-postgres://postgres@localhost:5432/postgres}"
psql "$URL" -qc "drop database if exists tool_proj_test" -c "create database tool_proj_test"
psql "$URL" -qAt -v ON_ERROR_STOP=1 -c '\c tool_proj_test' \
  -f supabase/tests/auth_stub.sql -f supabase/schema.sql -f supabase/schema.sql -f supabase/tests/rls_test.sql | grep -E '^OK'
psql "$URL" -qc "drop database tool_proj_test"
