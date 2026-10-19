# Vingo Enterprise CRM — Backup & Disaster Recovery Runbook

## 1. Objectives & Service Level Indicators (SLIs)
- **Recovery Point Objective (RPO):** < 1 hour (Maximum acceptable data loss in catastrophic disaster).
- **Recovery Time Objective (RTO):** < 30 minutes (Maximum time to restore full platform availability).
- **Encryption Standard:** AES-256 for backups at rest, TLS 1.3 in transit.

---

## 2. Backup Architecture & Tiers

### Tier 1: Continuous Point-in-Time Recovery (PITR)
- **Engine:** Supabase Enterprise / Managed PostgreSQL WAL-G Archiving.
- **Retention:** 30 days continuous WAL archives.
- **Granularity:** Restore to any single second within the past 30 days.
- **Trigger Scenario:** Accidental bulk data corruption, malicious injection, or fatal migration error.

### Tier 2: Automated Daily Logical Dumps
- **Engine:** Automated GitHub Actions / Cron Job running `pg_dump` with gzip compression and GPG symmetric encryption.
- **Destination:** Off-site AWS S3 / Cloudflare R2 bucket with Object Lock (WORM - Write Once, Read Many).
- **Retention Schedule:**
  - Daily dumps: Retained for 14 days
  - Weekly snapshots: Retained for 8 weeks
  - Monthly archives: Retained for 12 months

---

## 3. Automated Backup Script (`backup_and_recovery.sh`)

```bash
#!/usr/bin/env bash
# ==============================================================================
# Vingo CRM — Database Backup Script
# Usage: ./supabase/scripts/backup_and_recovery.sh backup
# ==============================================================================
set -euo pipefail

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/vingo_crm_backup_${TIMESTAMP}.sql.gz"
ENCRYPTED_FILE="${BACKUP_FILE}.enc"

mkdir -p "${BACKUP_DIR}"

echo "[INFO] Starting database backup at ${TIMESTAMP}..."

# 1. Perform logical pg_dump excluding transient cache tables
PGPASSWORD="${DB_PASSWORD}" pg_dump \
  -h "${DB_HOST}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  -p "${DB_PORT:-5432}" \
  --format=plain \
  --no-owner \
  --no-acl \
  --exclude-table="rate_limit_events" \
  | gzip -9 > "${BACKUP_FILE}"

echo "[SUCCESS] Dump completed: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"

# 2. Encrypt using GPG symmetric encryption
if [ -n "${BACKUP_PASSPHRASE:-}" ]; then
  echo "${BACKUP_PASSPHRASE}" | gpg --batch --yes --passphrase-fd 0 --symmetric --cipher-algo AES256 -o "${ENCRYPTED_FILE}" "${BACKUP_FILE}"
  rm -f "${BACKUP_FILE}"
  echo "[SUCCESS] Encrypted backup stored at: ${ENCRYPTED_FILE}"
fi

# 3. Prune local backups older than 14 days
find "${BACKUP_DIR}" -type f -name "vingo_crm_backup_*.sql.gz*" -mtime +14 -delete
echo "[INFO] Pruning completed."
```

---

## 4. Disaster Recovery & Restoration Procedures

### Scenario A: Restoring via Supabase PITR (Fastest)
1. Navigate to **Supabase Dashboard** -> **Project Settings** -> **Database** -> **Backups**.
2. Select **Point in Time Restore**.
3. Choose the exact UTC timestamp 1 minute prior to the disaster event.
4. Click **Restore Database**. Supabase clones the cluster, applies the WAL up to the specified second, and points DNS to the restored cluster (~15-20 min RTO).

### Scenario B: Manual Restoration from Encrypted Dump
```bash
# 1. Decrypt the archive
gpg --decrypt --batch --passphrase "${BACKUP_PASSPHRASE}" ./backups/vingo_crm_backup_YYYYMMDD_HHMMSS.sql.gz.enc > restored.sql.gz

# 2. Decompress
gunzip -k restored.sql.gz

# 3. Apply to target PostgreSQL instance in single transaction
PGPASSWORD="${RESTORE_DB_PASSWORD}" psql \
  -h "${RESTORE_DB_HOST}" \
  -U "${RESTORE_DB_USER}" \
  -d "${RESTORE_DB_NAME}" \
  --single-transaction \
  -f restored.sql

# 4. Verify table row parity
psql -h "${RESTORE_DB_HOST}" -U "${RESTORE_DB_USER}" -d "${RESTORE_DB_NAME}" -c "
  SELECT 
    (SELECT count(*) FROM employee_profiles) as employees,
    (SELECT count(*) FROM leads) as leads,
    (SELECT count(*) FROM audit_logs) as audit_logs;
"
```

---

## 5. Routine Recovery Drills
- Drills must be executed **bi-annually** on a staging replica.
- Verify that tamper-evident audit logs and RLS policies remain intact post-restoration.
- Log drill duration, observed RTO, and sign-off in the compliance register.
