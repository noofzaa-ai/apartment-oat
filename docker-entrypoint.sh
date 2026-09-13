#!/bin/sh

echo "Starting container entrypoint..."

# Ensure data directory exists and is writable
mkdir -p /app/data
chmod 755 /app/data

# Run Prisma migrations (using db push since we don't use migration history)
echo "Running Prisma db push to ensure schema is up to date..."
cd /app
if npx prisma db push --accept-data-loss; then
  echo "Prisma db push succeeded"
else
  echo "Prisma db push failed with exit code: $?"
  exit 1
fi

# Check if admin exists; if not, seed the database
echo "Checking if database needs seeding..."

# Create a temporary script to count admins
echo "Creating admin count script..."
cat > /tmp/count-admins.js << 'EOFJS'
// Add app node_modules to require path
process.env.NODE_PATH = '/app/node_modules';
require('module').Module._initPaths();

const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { PrismaClient } = require('@prisma/client');

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

prisma.admin
  .count()
  .then(c => {
    // Only stdout the count, no debug output
    console.log(c);
    process.exit(0);
  })
  .catch(e => {
    console.error('ERROR:', e.message);
    process.exit(1);
  });

setTimeout(() => {
  console.error('TIMEOUT');
  process.exit(2);
}, 10000);
EOFJS

echo "Running admin count script from /app..."
cd /app
ADMIN_COUNT=$(node /tmp/count-admins.js 2>/dev/null)
ADMIN_COUNT_EXIT=$?

echo "Admin count result: $ADMIN_COUNT (exit code: $ADMIN_COUNT_EXIT)"

# Only run seed if admin count is 0
if [ "$ADMIN_COUNT" = "0" ] && [ $ADMIN_COUNT_EXIT -eq 0 ]; then
  echo "No admin found. Running seed script..."
  if npx tsx prisma/seed.ts; then
    echo "Seeding succeeded"
  else
    echo "Seeding failed with exit code: $?"
    exit 1
  fi
else
  echo "Admin already exists (count=$ADMIN_COUNT, exit=$ADMIN_COUNT_EXIT). Skipping seed."
fi

echo "Container initialization complete. Starting server..."
exec node server.js
