# Supabase Backend Architecture (Backend-as-a-Service)

This folder contains the complete server-side backend resources for the **Vingo Enterprise CRM**.

In modern full-stack architectures using Supabase, you do not need to write a separate Express or Node server. Instead, Supabase acts as the backend through:
1. **PostgreSQL Database & Relational Schema:** Tables, foreign keys, indexes, triggers, and immutability rules.
2. **Row-Level Security (RLS):** Server-side authorization rules ensuring employees can only read/write permitted records.
3. **Supabase Auth:** Enterprise authentication with session tokens, JWTs, and password reset flows.
4. **Supabase Realtime:** WebSocket event broadcasting respecting database RLS policies.
5. **Supabase Edge Functions:** Serverless Deno functions for sensitive backend tasks (webhooks, email processing).
6. **Supabase Storage:** S3-compatible private object storage with MIME and size constraints.

---

## Directory Structure:

```
supabase/
├── migrations/             # PostgreSQL migrations (executed sequentially)
│   ├── 20261019000000_init_crm_schema.sql
│   ├── 20261019000001_seed_company_data.sql
│   ├── 20261019000002_roles_and_deactivation.sql
│   ├── 20261019000003_hr_attendance_leave_schema.sql
│   ├── 20261019000004_notices_and_policies_schema.sql
│   ├── 20261019000005_email_tracking_and_followups.sql
│   ├── 20261019000006_notifications_reports_audit.sql
│   └── 20261019000007_phase07_security_hardening.sql
│
├── functions/              # Serverless Edge Functions (Deno Runtime)
│   ├── email-webhook/      # Inbound email webhook with HMAC-SHA256 signature verification
│   ├── approve-leave/      # Server-side leave reviewer function
│   └── send-notification/  # Server-side push notification dispatcher
│
└── scripts/                # Database Administration & Operational Scripts
    └── backup_and_recovery.sh # Automated pg_dump backup & AES-256 decryption/restore
```

---

## Applying Migrations to Local or Production Supabase:
```bash
# Link your local CLI to your Supabase project:
supabase link --project-ref your-project-ref

# Push all reviewed migrations to the database:
supabase db push
```
