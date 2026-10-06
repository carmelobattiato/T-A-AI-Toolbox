#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  T&A AI Toolbox - Avvio Applicazione Dual-Container"
echo "=========================================================="

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "ERRORE: Docker non risulta installato o non è nel PATH."
    exit 1
fi

# Ensure data directory exists with write permissions for persistent DB
mkdir -p data

echo "Avvio dei container tramite Docker Compose..."
if docker compose version &> /dev/null; then
    docker compose up -d --build
elif command -v docker-compose &> /dev/null; then
    docker-compose up -d --build
else
    echo "ERRORE: né 'docker compose' né 'docker-compose' sono disponibili."
    exit 1
fi

echo ""
echo "=========================================================="
echo "  ✓ Applicazione avviata con successo in background!"
echo ""
echo "  - Frontend Web UI:  http://localhost:3000"
echo "  - Backend API:      http://localhost:5000/api"
echo "  - Database pers.:   ./data/db.json (mantiene le modifiche)"
echo "  - Impostazioni AI:  ./data/settings.json"
echo ""
echo "  Comandi utili:"
echo "    Visualizza log:   docker compose logs -f"
echo "    Arresta:          ./stop.sh  oppure  docker compose down"
echo "=========================================================="
