#!/usr/bin/env bash
set -e
umask 077

BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

if [ -f "data/db.json" ]; then
    cp "data/db.json" "$BACKUP_DIR/db_$TIMESTAMP.json"
    echo "✓ Backup database completato: $BACKUP_DIR/db_$TIMESTAMP.json"
fi

if [ -f "data/log.json" ]; then
    cp "data/log.json" "$BACKUP_DIR/log_$TIMESTAMP.json"
    echo "✓ Backup audit log completato: $BACKUP_DIR/log_$TIMESTAMP.json"
fi

if [ -f "data/settings.json" ]; then
    cp "data/settings.json" "$BACKUP_DIR/settings_$TIMESTAMP.json"
    echo "✓ Backup impostazioni completato: $BACKUP_DIR/settings_$TIMESTAMP.json"
fi
