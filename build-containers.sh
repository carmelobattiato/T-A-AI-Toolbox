#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  T&A AI Toolbox - Costruzione Immagini Docker Dual-Container"
echo "=========================================================="

# Ensure data directory exists
mkdir -p data

echo "1. Costruzione container Backend + Database..."
docker build -t ta-toolbox-backend:latest -f Dockerfile.backend .

echo ""
echo "2. Costruzione container Frontend (Nginx SPA)..."
docker build -t ta-toolbox-frontend:latest -f Dockerfile.frontend .

echo ""
echo "=========================================================="
echo "  ✓ Immagini create con successo:"
echo "    - ta-toolbox-backend:latest"
echo "    - ta-toolbox-frontend:latest"
echo ""
echo "  Per avviare l'applicazione esegui:"
echo "    ./start.sh   oppure   docker compose up -d"
echo "=========================================================="
