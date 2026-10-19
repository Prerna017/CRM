# Vingo — Enterprise CRM & Workforce Management Platform

A high-performance, modular enterprise CRM and employee operations platform engineered for growing teams (11–50 employees). Built with React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui design system, TanStack Query, and Supabase PostgreSQL.

---

## Architecture Overview

Vingo is organized into clear domain modules and strict architectural boundaries:

```
src/
├── app/                  # Application bootstrap, routing & global providers
│   ├── App.tsx           # Root component
│   ├── router.tsx        # React Router routes & auth guards
│   └── providers.tsx     # TanStack Query, Auth, Toast & ErrorBoundary providers
├── components/           # Reusable Design System Components
│   ├── ui/               # Atomic shadcn/ui primitives (button, dialog, card, etc.)
│   ├── layout/           # AppLayout, Header, Sidebar, PageContainer
│   ├── forms/            # FormField, FormError, Label integrations
│   ├── tables/           # Generic typed DataTable, TablePagination
│   └── feedback/         # LoadingSpinner, EmptyState, ConfirmDialog, ErrorBoundary
├── features/             # Modular Domain Business Logic
│   ├── auth/             # Login, register, profile session management
│   ├── dashboard/        # Executive KPIs, attendance snapshot, pipeline metrics
│   ├── employees/        # Employee directory, roles, departments, quotas
│   ├── attendance/       # Clock-in / clock-out, presence tracking, timesheets
│   ├── leave/            # Leave application, approvals, quota balance
│   ├── holidays/         # Company holiday calendar & countdowns
│   ├── notices/          # Internal company announcements & broadcasts
│   ├── policies/         # Company handbook, HR policies & acknowledgments
│   ├── leads/            # Sales lead pipeline (Kanban & List), deal tracking
│   ├── email/            # Outbound email payloads & activity logging
│   ├── notifications/    # Real-time alerts & broadcasts
│   ├── reports/          # Executive summaries, work hours, conversion stats
│   └── settings/         # Company profile, working hours, preferences
├── hooks/                # Custom React hooks (useDebounce, useMediaQuery, useDisclosure)
├── lib/                  # Shared utilities, Supabase client & validation
│   ├── supabase.ts       # Typed Supabase client with offline/fallback resilience
│   ├── utils.ts          # Class merging (cn), currency & date formatters
│   └── validation/       # Zod schemas (auth, leads, employees, leave, attendance)
├── types/                # TypeScript interface definitions (database.ts)
└── test/                 # Test suites & setup (Vitest + React Testing Library)

supabase/
├── migrations/           # Versioned PostgreSQL migrations & RLS policies
│   ├── 20261019000000_init_crm_schema.sql
│   └── 20261019000001_seed_company_data.sql
└── functions/            # Supabase Edge Functions (Deno / TypeScript)
    ├── send-notification/
    ├── email-webhook/
    └── approve-leave/

tests/
└── e2e/                  # End-to-end smoke & navigation tests
```

---

## Technology Stack

- **Framework**: [React 19](https://react.dev/) + [Vite 8](https://vitejs.dev/)
- **Language**: [TypeScript 5/7](https://www.typescriptlang.org/) (Strict mode enabled)
- **Styling & UI**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) + [Class Variance Authority (CVA)](https://cva.style/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Server State & Caching**: [TanStack Query v5](https://tanstack.com/query/latest)
- **Forms & Validation**: [React Hook Form](https://react-hook-form.com/) + [Zod v4](https://zod.dev/)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security)
- **Testing**: [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/)
- **Linting**: [Oxlint](https://oxc.rs/docs/guide/usage/linter)

---

## Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation

1. Clone or navigate to the repository:
   ```bash
   cd CRM
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   ```bash
   cp .env.example .env
   ```
   *(If left empty, the application automatically boots in interactive pre-seeded development mode with mock company records).*

4. Start the local development server:
   ```bash
   npm run dev
   ```
   The application will be live at `http://localhost:5173`.

---

## Supabase Database Setup

### Option A: Cloud Supabase Project

1. Create a project at [supabase.com](https://supabase.com).
2. Retrieve your **Project URL** and **Anon API Key** from **Project Settings > API**.
3. Populate your `.env` file:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
4. In your Supabase Dashboard **SQL Editor**, execute the migration files sequentially:
   - `supabase/migrations/20261019000000_init_crm_schema.sql` (Creates tables, enum types, and RLS policies)
   - `supabase/migrations/20261019000001_seed_company_data.sql` (Seeds initial team, leads, announcements, and policies)

### Option B: Local Supabase CLI

```bash
# Initialize Supabase locally
supabase start

# Apply migrations
supabase db reset

# Deploy edge functions
supabase functions deploy send-notification
supabase functions deploy email-webhook
supabase functions deploy approve-leave
```

---

## Available Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `vite` | Starts local HMR development server |
| `npm run build` | `tsc -b && vite build` | Type-checks and creates production bundle in `dist/` |
| `npm run typecheck` | `tsc --noEmit` | Strict TypeScript type validation without emitting files |
| `npm run lint` | `oxlint` | High-speed Rust-based code quality and hooks linting |
| `npm run test` | `vitest run` | Runs unit and e2e smoke test suites |
| `npm run preview` | `vite preview` | Previews production build locally |

---

## Deployment

### Vercel / Netlify
1. Connect your Git repository.
2. Build Settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy! Single-page application routing is natively supported.

---

## License
Proprietary — Internal Company Use Only.
