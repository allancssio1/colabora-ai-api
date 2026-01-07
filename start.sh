#!/bin/sh

# Wait for database to be ready
echo "Waiting for database to be ready..."

# Loop until we can connect to the database port (5432) on host 'db'
# Using nc (netcat) which is usually available in Alpine
# Retry up to 30 times with 1 second delay
i=0
while ! nc -z db 5432; do   
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
npm start
