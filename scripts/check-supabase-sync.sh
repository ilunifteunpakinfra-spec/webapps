#!/usr/bin/env bash
# Compare RLS policy names between local SQL files and the live Supabase database.
# Processes files in order, tracking DROP/CREATE so fix-migrations are handled correctly.
# Usage: bash scripts/check-supabase-sync.sh  (requires DATABASE_URL in .env)

set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a; source .env; set +a
fi

: "${DATABASE_URL:?DATABASE_URL not set in .env}"

FILES=(supabase/schema.sql supabase/storage-policies.sql supabase/migrations/*.sql)

# Sequentially replay CREATE/DROP POLICY statements to derive the final local state.
# Output: policy_name<TAB>target_table
cat "${FILES[@]}" | tr 'A-Z' 'a-z' | awk '
{
  l = $0
  sub(/^[ \t]+/, "", l)
  if (l ~ /^--/) next                      # skip comment lines

  if (l ~ /create[ \t]+policy/) {
    line = l
    sub(/.*create[ \t]+policy[ \t]+/, "", line)
    gsub(/"/, "", line)
    split(line, w, /[ \t(]/)
    cur = w[1]
    created[cur] = 1
    rest = line
    sub(/^[^ \t]+[ \t]*/, "", rest)
    if (rest ~ /^on[ \t]/) {               # inline: CREATE POLICY x ON table ...
      sub(/^on[ \t]+/, "", rest)
      split(rest, w2, /[ \t(]/)
      target[cur] = w2[1]
    }
    next
  }

  if (l ~ /drop[ \t]+policy/) {
    line = l
    sub(/.*drop[ \t]+policy[ \t]+/, "", line)
    sub(/^if[ \t]+exists[ \t]*/, "", line)
    gsub(/"/, "", line)
    split(line, w, /[ \t(]/)
    delete created[w[1]]
    delete target[w[1]]
    cur = ""
    next
  }

  if (cur != "" && l ~ /^on[ \t]/) {       # continuation line: ON table FOR ...
    t = l
    sub(/^on[ \t]+/, "", t)
    split(t, w2, /[ \t(]/)
    target[cur] = w2[1]
  }
}
END {
  for (n in created) print n "\t" ((n in target) ? target[n] : "?")
}' | sort -u > /tmp/pairs.txt

awk -F'\t' '$2 !~ /^storage\./ { print $1 }' /tmp/pairs.txt | sort -u > /tmp/local_public.txt
awk -F'\t' '$2 ~ /^storage\./ { print $1 }' /tmp/pairs.txt | sort -u > /tmp/local_storage.txt

psql "$DATABASE_URL" -tAc "select policyname from pg_policies where schemaname='public'" | sort -u > /tmp/remote_public.txt
psql "$DATABASE_URL" -tAc "select policyname from pg_policies where schemaname='storage'" | sort -u > /tmp/remote_storage.txt

echo "== PUBLIC policies (< local-only, > remote-only) =="
if diff /tmp/local_public.txt /tmp/remote_public.txt; then
  echo "PUBLIC: IDENTICAL ($(wc -l < /tmp/local_public.txt) policies)"
fi

echo
echo "== STORAGE policies (< local-only, > remote-only) =="
if diff /tmp/local_storage.txt /tmp/remote_storage.txt; then
  echo "STORAGE: IDENTICAL ($(wc -l < /tmp/local_storage.txt) policies)"
fi