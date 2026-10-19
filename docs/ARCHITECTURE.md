# Vingo Enterprise CRM — Full-Stack Architecture Guide

## 1. System Topology Overview

```
                      +---------------------------------------+
                      |           Client Web Browser          |
                      |  React 19 + TypeScript + Vite + CSS   |
                      +-------------------+-------------------+
                                          |
                                          | HTTPS / WebSockets (WSS)
                                          v
+---------------------------------------------------------------------------------+
|                                 SUPABASE BACKEND                                |
|                                                                                 |
|  +-----------------------+  +----------------------+  +----------------------+  |
|  |     Supabase Auth     |  |   PostgreSQL Engine  |  |  Supabase Realtime   |  |
|  | JWT Session & Tokens  |  | Relational Schema    |  |  WebSocket Broadcaster| |
|  +-----------------------+  |  Row-Level Security  |  +----------------------+  |
|                             |  Immutable Audits    |                            |
|                             +----------+-----------+                            |
|                                        |                                        |
|                                        v                                        |
|                             +----------------------+                            |
|                             |    Edge Functions    |                            |
|                             | Deno Serverless APIs |                            |
|                             | HMAC Webhook Verify  |                            |
|                             +----------------------+                            |
+---------------------------------------------------------------------------------+
```

---

## 2. Frontend Organization (`src/`)
- `app/` — Root application bootstrapper, providers, and route definitions (`App.tsx`, `router.tsx`, `providers.tsx`).
- `components/` — UI building blocks:
  - `ui/`: Standard design primitives (Buttons, Cards, Inputs, Modals, Tabs, Badges).
  - `layout/`: Persistent desktop & mobile responsive navigation (`Header`, `Sidebar`, `AppLayout`).
  - `feedback/`: ErrorBoundary, LoadingSpinner, EmptyState, ConfirmDialog.
  - `forms/` & `tables/`: Reusable table views and pagination controls.
- `context/` — Global auth state (`AuthContext.tsx`) with session management, role verification, and rate limiting.
- `hooks/` — Reusable reactive hooks (`useDebounce`, `useDisclosure`, `useMediaQuery`).
- `lib/` — Frontend utilities and security:
  - `supabase.ts`: Supabase client initialization.
  - `rateLimiter.ts`: Client-side sliding-window rate limiter.
  - `security.ts`: PII masking and constant-time comparison.
  - `fileValidation.ts`: File upload MIME and size limits.
  - `validationSchemas.ts`: Strict Zod input schemas.
- `pages/` — All 23 application views.
- `services/` — Data Access & API Layer:
  - `crmService.ts`: Central CRM Service facade (dual-mode).
  - `mock/mockData.ts`: Offline/demo seed dataset for immediate local evaluation without credentials.
- `types/` — Comprehensive TypeScript interfaces for database records and domain entities.

---

## 3. Backend Organization (`supabase/`)
- `migrations/` — Ordered SQL scripts creating tables, indexes, triggers, and Row Level Security policies.
- `functions/` — Serverless edge functions handling webhooks and administrative automation.
- `scripts/` — Automated encrypted backup and restoration shell scripts.

---

## 4. Dual-Mode Operation (Mock vs Live Database)
- **Local / Demo Mode:** When `VITE_SUPABASE_URL` is unconfigured, the app transparently operates using an in-memory/localStorage store pre-seeded with 50 employee, lead, and HR records.
- **Production Mode:** When valid Supabase credentials are provided in `.env`, the client directly queries PostgreSQL via `@supabase/supabase-js`, protected by Row Level Security policies.
