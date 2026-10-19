#!/usr/bin/env bash
# ==============================================================================
# Vingo CRM — Database Backup & Recovery Script
# Usage:
#   ./supabase/scripts/backup_and_recovery.sh backup
#   ./supabase/scripts/backup_and_recovery.sh restore <backup_file>
# ==============================================================================
set -euo pipefail

ACTION="${1:-backup}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p "${BACKUP_DIR}"

if [ "${ACTION}" = "backup" ]; then
  BACKUP_FILE="${BACKUP_DIR}/vingo_crm_backup_${TIMESTAMP}.sql.gz"
  echo "[INFO] Commencing logical database backup to ${BACKUP_FILE}..."

  PGPASSWORD="${DB_PASSWORD:-postgres}" pg_dump \
    -h "${DB_HOST:-localhost}" \
    -U "${DB_USER:-postgres}" \
    -d "${DB_NAME:-postgres}" \
    -p "${DB_PORT:-54322}" \
    --format=plain \
    --no-owner \
    --no-acl \
    --exclude-table="rate_limit_events" \
    | gzip -9 > "${BACKUP_FILE}"

  echo "[SUCCESS] Backup written successfully: ${BACKUP_FILE}"

  if [ -n "${BACKUP_PASSPHRASE:-}" ]; then
    echo "[INFO] Encrypting archive with AES256..."
    echo "${BACKUP_PASSPHRASE}" | gpg --batch --yes --passphrase-fd 0 --symmetric --cipher-algo AES256 -o "${BACKUP_FILE}.enc" "${BACKUP_FILE}"
    rm -f "${BACKUP_FILE}"
    echo "[SUCCESS] Encrypted backup stored: ${BACKUP_FILE}.enc"
  fi

elif [ "${ACTION}" = "restore" ]; then
  FILE_TO_RESTORE="${2:-}"
  if [ -z "${FILE_TO_RESTORE}" ] || [ ! -f "${FILE_TO_RESTORE}" ]; then
    echo "[ERROR] Please specify a valid backup file to restore."
    exit 1
  fi

  echo "[CAUTION] Restoring database from ${FILE_TO_RESTORE}..."
  if [[ "${FILE_TO_RESTORE}" == *.enc ]]; then
    echo "[INFO] Decrypting archive..."
    gpg --decrypt --batch --passphrase "${BACKUP_PASSPHRASE:-}" "${FILE_TO_RESTORE}" | gunzip | PGPASSWORD="${DB_PASSWORD:-postgres}" psql \
      -h "${DB_HOST:-localhost}" \
      -U "${DB_USER:-postgres}" \
      -d "${DB_NAME:-postgres}" \
      -p "${DB_PORT:-54322}" \
      --single-transaction
  else
    gunzip -c "${FILE_TO_RESTORE}" | PGPASSWORD="${DB_PASSWORD:-postgres}" psql \
      -h "${DB_HOST:-localhost}" \
      -U "${DB_USER:-postgres}" \
      -d "${DB_NAME:-postgres}" \
      -p "${DB_PORT:-54322}" \
      --single-transaction
  fi
  echo "[SUCCESS] Restoration completed."
else
  echo "Usage: $0 {backup|restore <file>}"
  exit 1
fi
