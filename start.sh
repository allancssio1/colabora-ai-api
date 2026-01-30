#!/bin/sh

# Extract host and port from DATABASE_URL
DB_HOST=$(echo "$DATABASE_URL" | sed -e 's|.*@\([^:/]*\).*|\1|')
DB_PORT=$(echo "$DATABASE_URL" | sed -e 's|.*:\([0-9]*\)/.*|\1|')
DB_PORT=${DB_PORT:-5432}

echo "Waiting for database at $DB_HOST:$DB_PORT..."

i=0
while ! nc -z "$DB_HOST" "$DB_PORT"; do   
  i=$((i+1))
  if [ $i -ge 60 ]; then
     echo "Database connection timed out."
     exit 1
  fi
  sleep 1
  echo "Waiting for database... $i"
done

echo "Database started!"

echo "Running migrations..."
npm run migrate

if [ $? -eq 0 ]; then
  echo "Migrations completed successfully."
else
  echo "Migration failed!"
  exit 1
fi

echo "Starting application..."

# Check if NODE_ENV is set to dev for development mode
if [ "$NODE_ENV" = "dev" ]; then
  echo "Running in DEVELOPMENT mode with hot reload..."
  npm run dev
else
  echo "Running in PRODUCTION mode..."
  npm run build
  npm start
fi
