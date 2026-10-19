# Domain Feature Modules

This directory is reserved for domain-driven feature packaging as the CRM scales beyond 50 employees.

## Module Structure Pattern:
Each feature module encapsulates its domain-specific components, hooks, validation schemas, and state:
- `leads/` — Sales Pipeline Kanban, Dead Lead claiming, conversion reports
- `attendance/` — Timesheets, clock in/out, regularization dialogs
- `leave/` — Absence applications, approvals, balance quotas
- `employees/` — Directory, profile modals, role assignment
- `email/` — Inbound tracking, manual logging, follow-up scheduling
- `notices/` — Company-wide broadcasts, acknowledgement status
- `policies/` — Corporate compliance versioning and digital signatures
- `reports/` — Telemetry KPIs, formula dictionary, CSV export
- `settings/` — Work hours, grace thresholds, company metadata
