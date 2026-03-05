#!/bin/sh
set -e

echo "=============================================="
echo "  AI Wedding - Container Starting"
echo "=============================================="
echo ""

wait_for_db() {
  if [ -z "$DATABASE_URL" ]; then
    echo "[ERROR] DATABASE_URL is not set"
    exit 1
  fi

  DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:/]*\).*|\1|p')
  DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
  DB_PORT=${DB_PORT:-5432}

  echo "[DB] Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."

  MAX_RETRIES=30
  RETRY=0
  while [ $RETRY -lt $MAX_RETRIES ]; do
    if pg_isready -h "$DB_HOST" -p "$DB_PORT" -q 2>/dev/null; then
      echo "[DB] PostgreSQL is ready"
      return 0
    fi
    RETRY=$((RETRY + 1))
    echo "[DB] Waiting... (${RETRY}/${MAX_RETRIES})"
    sleep 2
  done

  echo "[ERROR] PostgreSQL not ready after ${MAX_RETRIES} attempts"
  exit 1
}

run_migrations() {
  if [ "${SKIP_MIGRATIONS:-false}" = "true" ]; then
    echo "[DB] Skipping migrations (SKIP_MIGRATIONS=true)"
    return 0
  fi

  echo "[DB] Syncing database schema..."
  npx prisma db push --accept-data-loss 2>&1 || {
    echo "[WARN] prisma db push failed, trying migrate deploy..."
    npx prisma migrate deploy 2>&1 || {
      echo "[ERROR] Migration failed"
      exit 1
    }
  }
  echo "[DB] Schema sync completed"
}

run_seed() {
  if [ "${SKIP_SEED:-false}" = "true" ]; then
    echo "[DB] Skipping seed (SKIP_SEED=true)"
    return 0
  fi

  echo "[DB] Running database seed..."
  npx prisma db seed 2>&1 || {
    echo "[WARN] Seed failed (may already be seeded)"
  }
  echo "[DB] Seed completed"
}

wait_for_db
run_migrations
run_seed

if [ -n "$ADMIN_EMAIL" ]; then
  echo ""
  echo "[INFO] Admin account: $ADMIN_EMAIL"
fi

echo ""
echo "=============================================="
echo "  Starting Next.js application on port 3000"
echo "=============================================="
echo ""

exec "$@"
