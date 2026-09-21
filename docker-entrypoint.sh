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

# Check if user data exists; if not, seed the database
echo "Checking if database needs seeding..."

# Create a temporary script to count users
echo "Creating user count script..."
cat > /tmp/count-users.js << 'EOFJS'
// Add app node_modules to require path
process.env.NODE_PATH = '/app/node_modules';
require('module').Module._initPaths();

const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { PrismaClient } = require('@prisma/client');

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

prisma.user
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

echo "Running user count script from /app..."
cd /app
USER_COUNT=$(node /tmp/count-users.js 2>/dev/null)
USER_COUNT_EXIT=$?

echo "User count result: $USER_COUNT (exit code: $USER_COUNT_EXIT)"

# Only run seed if user count is 0
if [ "$USER_COUNT" = "0" ] && [ $USER_COUNT_EXIT -eq 0 ]; then
  echo "No users found. Running seed script..."
  if npx tsx prisma/seed.ts; then
    echo "Seeding succeeded"
  else
    echo "Seeding failed with exit code: $?"
    exit 1
  fi
else
  echo "Users already exist (count=$USER_COUNT, exit=$USER_COUNT_EXIT). Skipping seed."
fi

echo "Container initialization complete. Starting server..."
exec node server.js
