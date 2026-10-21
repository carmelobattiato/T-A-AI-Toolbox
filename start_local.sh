#!/usr/bin/env bash
# Avvio locale senza Docker: un solo processo Node (API Express + frontend Vite).
set -e
cd "$(dirname "$0")"

echo "=========================================================="
echo "  ADM Project Blueprint - Avvio locale (senza Docker)"
echo "=========================================================="

if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo "ERRORE: Node.js e npm non risultano installati o non sono nel PATH."
    exit 1
fi

DEFAULT_PORT=3000
read -r -p "Porta su cui avviare l'applicazione [${DEFAULT_PORT}]: " PORT
PORT=${PORT:-$DEFAULT_PORT}

if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
    echo "ERRORE: porta non valida: '$PORT' (serve un numero tra 1 e 65535)."
    exit 1
fi

if command -v lsof &> /dev/null && lsof -iTCP:"$PORT" -sTCP:LISTEN -t &> /dev/null; then
    echo "ERRORE: la porta $PORT è già in uso."
    exit 1
fi

if [ ! -d node_modules ]; then
    echo "Installazione dipendenze (npm ci)..."
    npm ci
fi

mkdir -p data

echo ""
echo "  - Applicazione:    http://localhost:${PORT}"
echo "  - Backend API:     http://localhost:${PORT}/api"
echo "  - Database:        ./data/db.json"
echo "  - Impostazioni AI: ./data/settings.json"
echo "  Ctrl+C per arrestare."
echo "=========================================================="

PORT="$PORT" exec node_modules/.bin/tsx server.ts
