#!/bin/sh

echo "Attempt to connect to Mongo server shell..."
docker compose exec mongo sh -c 'mongosh -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin "$MONGO_INITDB_DATABASE"'