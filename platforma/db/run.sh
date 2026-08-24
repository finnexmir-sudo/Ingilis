#!/usr/bin/env bash
# Butun SQL fayllarini duzgun sira ile isledir.
# Lokal yoxlama:  ./run.sh tehsil --local
# Supabase-de:    01..05 fayllarini SQL Editor-a bu sira ile yapisdir
#                 (test/ qovlugundakilari YOX).
set -euo pipefail
DB="${1:-tehsil}"; LOCAL="${2:-}"
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f test/00_supabase_stub.sql
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f 01_schema.sql
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f 02_rls.sql
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f 03_rpc.sql
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f 06_educator_rpc.sql
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f 04_seed.sql
# Supabase-in default huquqlarini tekrarlayiriq ki, revoke-larin
# hequiqeten isledigini yoxlaya bilek
[ "$LOCAL" = "--local" ] && psql -v ON_ERROR_STOP=1 -q -d "$DB" -f test/01_grants.sql
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f 05_grants.sql
