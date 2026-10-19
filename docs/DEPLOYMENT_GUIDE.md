# Vingo Enterprise CRM — Production Deployment Guide

## Overview
This document guides technical administrators through deploying **Vingo Enterprise CRM & Workforce Management Platform** to production using **Vercel** (Frontend) and **Supabase** (Database, Auth, Storage, and Realtime).

---

## 1. Pre-Deployment Verification

Execute all verification checks locally:
```bash
# 1. Typecheck TypeScript
npm run typecheck

# 2. Run unit, integration, and security test suites
npm test

# 3. Create production bundle
npm run build
```

---

## 2. Database Migration Deployment Order

Apply the SQL migrations sequentially in your production Supabase project via the **Supabase Dashboard SQL Editor** or via Supabase CLI (`supabase db push`):

1. `20261019000000_init_crm_schema.sql` — Core CRM schema (profiles, leads, activities, attendance, settings).
2. `20261019000001_seed_company_data.sql` — Initial company seed data & default founder profile.
3. `20261019000002_roles_and_deactivation.sql` — Multi-role permissions, status constraints, deactivation rules.
4. `20261019000003_hr_attendance_leave_schema.sql` — HR attendance timesheets, leave requests, approval flows.
5. `20261019000004_notices_and_policies_schema.sql` — Policy versioning, acknowledgements, company notices.
6. `20261019000005_email_tracking_and_followups.sql` — Inbound/outbound email logs, follow-up scheduling, buffer.
7. `20261019000006_notifications_reports_audit.sql` — In-app persistent notifications, tamper-evident audit ledger.
8. `20261019000007_phase07_security_hardening.sql` — Server triggers preventing self-promotion, storage RLS, rate limiting.

---

## 3. Supabase Authentication & URL Configuration

In **Supabase Dashboard** -> **Authentication** -> **URL Configuration**:

- **Site URL:**
  `https://your-company-crm.vercel.app`
- **Redirect URLs (Allow list):**
  - `https://your-company-crm.vercel.app/**`
  - `https://your-company-crm.vercel.app/reset-password`
  - `https://your-company-crm.vercel.app/login`
  - `http://localhost:5173/**` (for local development)
- **Token Expiry Settings:**
  - Access Token Expiration: `3600` seconds (1 hour).
  - Refresh Token Expiration: `604800` seconds (7 days) with reuse interval `10` seconds.

---

## 4. Email Provider OAuth & Webhook Setup

### Gmail API / Microsoft Graph OAuth:
1. In Google Cloud Console or Azure Entra ID:
   - Configure OAuth 2.0 Web Client.
   - Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`.
   - Scopes: `openid`, `email`, `profile`, `https://www.googleapis.com/auth/gmail.send`.
2. In Supabase Dashboard -> **Authentication** -> **Providers**:
   - Enable Google / Azure and provide Client ID and Client Secret.

### Inbound Email Webhook:
Deploy the hardened edge function:
```bash
supabase functions deploy email-webhook --no-verify-jwt
supabase secrets set EMAIL_WEBHOOK_SECRET="your_production_hmac_secret"
```
Configure your email service (SendGrid/Resend/Mailgun) to point inbound parse webhooks to:
`https://<your-project-ref>.supabase.co/functions/v1/email-webhook`
Ensure the webhook includes header `x-webhook-signature` or `x-hub-signature-256`.

---

## 5. Vercel Frontend Deployment

### Deploy via Vercel CLI:
```bash
# Link project
vercel link

# Set environment variables
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_APP_COMPANY_NAME production
vercel env add VITE_FOUNDER_EMAIL production
vercel env add VITE_APP_ENV production
vercel env add VITE_APP_URL production

# Deploy to production
vercel --prod
```

### Environment Variables Checklist:
| Variable Name | Environment | Value Description |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Production | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Production | Anonymous public client key |
| `VITE_APP_COMPANY_NAME` | Production | Legal corporate name (e.g., `Vingo Technologies Inc.`) |
| `VITE_FOUNDER_EMAIL` | Production | Primary executive admin email |
| `VITE_APP_ENV` | Production | `production` |
| `VITE_APP_URL` | Production | `https://your-company-crm.vercel.app` |

---

## 6. Pre-Seeded Production Test Accounts

| Account Role | Official Email | Default Access Scope |
| :--- | :--- | :--- |
| **Founder / Executive Admin** | `founder@vingo.internal` | Full system governance, audit ledger, employee provisioning |
| **Sales Representative** | `alex.morgan@vingo.internal` | Lead pipeline, dead lead claiming, email replies, attendance |
| **Support Engineer** | `marcus.vance@vingo.internal` | Support leads, notices, policy acknowledgement, attendance |
| **Operations Manager** | `elena.rostova@vingo.internal` | Team attendance review, leave approval, pipeline reports |
| **Deactivated Account** | `deactivated.rep@vingo.internal` | Blocked: All session and API requests rejected |

---

## 7. Post-Deployment Smoke Verification Checklist
- [ ] HTTPS enforced and SSL certificate active.
- [ ] Security headers confirmed (inspect headers via browser DevTools: CSP, X-Frame-Options, HSTS).
- [ ] Founder logs in via Admin Portal; dashboard statistics load from database.
- [ ] Employee logs in via Employee Portal; salary/emergency contacts of peers are masked.
- [ ] Employee checks in; attendance status reflects `present` or `late`.
- [ ] Employee applies for leave; Founder receives persistent notification and can approve.
- [ ] Dead lead claiming exclusivity lock works; second employee attempt receives 409 locked alert.
- [ ] Deactivated user login fails with account deactivation banner.
- [ ] Audit logs viewable by Founder with detailed before/after diffs; modifications blocked.
