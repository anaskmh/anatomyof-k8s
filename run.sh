#!/usr/bin/env bash
# CloudTruck helper script.
#
#   ./run.sh                 install deps, set up the jobs table, load PDFs, start dev server
#   ./run.sh dev             start the Vite dev server (http://localhost:5173)
#   ./run.sh build           production build into dist/
#   ./run.sh preview         serve the production build locally
#   ./run.sh db              migrate + extract PDFs + seed (full jobs pipeline)
#   ./run.sh db:migrate      create/update the jobs table in Neon
#   ./run.sh db:extract      parse docs/jobs/*.pdf into data/jobs.json
#   ./run.sh db:seed         upsert data/jobs.json into Neon
#   ./run.sh db:refresh      extract + seed, and close roles missing from the PDFs
#   ./run.sh help            show this message

set -euo pipefail
cd "$(dirname "$0")"

bold()  { printf '\033[1m%s\033[0m\n' "$*"; }
info()  { printf '\033[36m➜\033[0m %s\n' "$*"; }
ok()    { printf '\033[32m✓\033[0m %s\n' "$*"; }
fail()  { printf '\033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }

require_node() {
  command -v node >/dev/null 2>&1 || fail "node is not installed (need Node 18+)"
  command -v npm  >/dev/null 2>&1 || fail "npm is not installed"
}

ensure_deps() {
  if [ ! -d node_modules ]; then
    info "Installing dependencies"
    npm install
  fi
}

ensure_env() {
  if [ ! -f .env ]; then
    if [ -f .env.example ]; then
      cp .env.example .env
      fail ".env was missing. Created it from .env.example; fill in DATABASE_URL from the Neon dashboard and re-run."
    fi
    fail ".env is missing. Create it with DATABASE_URL=postgresql://... (see README)."
  fi
  if grep -q 'USER:PASSWORD@HOST' .env; then
    fail ".env still contains the placeholder DATABASE_URL. Fill it in from the Neon dashboard."
  fi
}

ensure_pdfs() {
  if ! ls docs/jobs/*.pdf >/dev/null 2>&1; then
    fail "No PDFs found in docs/jobs/. Drop the vacancy PDFs there first."
  fi
}

cmd="${1:-all}"

case "$cmd" in
  help|-h|--help)
    sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
    ;;

  dev)
    require_node; ensure_deps
    bold "Starting dev server"
    npm run dev
    ;;

  build)
    require_node; ensure_deps
    bold "Building for production"
    npm run build
    ok "Build written to dist/"
    ;;

  preview)
    require_node; ensure_deps
    [ -d dist ] || npm run build
    npm run preview
    ;;

  db:migrate)
    require_node; ensure_deps; ensure_env
    bold "Migrating jobs table"
    npm run db:migrate
    ;;

  db:extract)
    require_node; ensure_deps; ensure_pdfs
    bold "Extracting jobs from PDFs"
    npm run db:extract
    ;;

  db:seed)
    require_node; ensure_deps; ensure_env
    [ -f data/jobs.json ] || fail "data/jobs.json not found. Run ./run.sh db:extract first."
    bold "Seeding jobs into Neon"
    npm run db:seed
    ;;

  db:refresh)
    require_node; ensure_deps; ensure_env; ensure_pdfs
    bold "Refreshing jobs (extract + seed + close stale)"
    npm run db:refresh
    ;;

  db)
    require_node; ensure_deps; ensure_env; ensure_pdfs
    bold "Running full jobs pipeline"
    info "1/3 migrate";  npm run db:migrate
    info "2/3 extract";  npm run db:extract
    info "3/3 seed";     npm run db:seed
    ok "Jobs pipeline complete"
    ;;

  all)
    require_node; ensure_deps
    if [ -f .env ] && ! grep -q 'USER:PASSWORD@HOST' .env && ls docs/jobs/*.pdf >/dev/null 2>&1; then
      bold "Setting up jobs database"
      npm run db:migrate
      npm run db:extract
      npm run db:seed
    else
      info "Skipping jobs database setup (.env or docs/jobs/*.pdf not ready). The site still runs; the job board will show its offline state."
    fi
    bold "Starting dev server"
    npm run dev
    ;;

  *)
    fail "Unknown command: $cmd (try ./run.sh help)"
    ;;
esac
