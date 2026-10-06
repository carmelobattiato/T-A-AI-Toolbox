#!/usr/bin/env bash
set -e

echo "Arresto dei container T&A AI Toolbox..."

if docker compose version &> /dev/null; then
    docker compose down
elif command -v docker-compose &> /dev/null; then
    docker-compose down
else
    echo "Arresto manuale container..."
    docker stop ta-toolbox-frontend ta-toolbox-backend || true
    docker rm ta-toolbox-frontend ta-toolbox-backend || true
fi

echo "✓ Container arrestati. I dati nel volume ./data sono preservati intatti."
