#!/bin/bash
# Backup script for PostgreSQL database
# Run via cron: 0 2 * * * /path/to/backup.sh

set -e

BACKUP_DIR="/backups"
DB_NAME="dental_clinic"
DB_USER="dental_clinic"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "Starting backup at $(date)"

# Create compressed backup
pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges | gzip > "$BACKUP_FILE"

echo "Backup saved to $BACKUP_FILE"

# Upload to cloud storage (optional)
# aws s3 cp "$BACKUP_FILE" s3://your-bucket/backups/

# Clean old backups
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed at $(date)"
echo "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"