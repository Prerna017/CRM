import {
  UserProfile,
  AttendanceRecord,
  LeaveRecord,
  Lead,
  LeadActivity,
  Announcement,
  Policy,
  CompanyHoliday
} from '../types/database';

export const INITIAL_PROFILES: UserProfile[] = [
  {
    id: 'user-founder-001',
    email: 'founder@vingo.com',
    name: 'Prerna Sharma',
    role: 'admin',
    title: 'Founder & CEO',
    department: 'Executive',
    phone: '+1 (555) 019-2834',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    join_date: '2023-01-15',
    salary: 165000,
    annual_leave_quota: 25,
    sick_leave_quota: 12,
    casual_leave_quota: 10,
    created_at: '2023-01-15T09:00:00Z',
    updated_at: '2026-10-19T09:00:00Z',
  },
  {
    id: 'user-sales-002',
    email: 'alex@vingo.com',
    name: 'Alex Morgan',
    role: 'employee',
    title: 'Senior Account Executive',
    department: 'Sales',
    phone: '+1 (555) 349-1120',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    join_date: '2023-05-10',
    salary: 92000,
    annual_leave_quota: 18,
    sick_leave_quota: 10,
    casual_leave_quota: 8,
    created_at: '2023-05-10T09:00:00Z',
    updated_at: '2026-10-19T09:00:00Z',
  },
  {
    id: 'user-eng-003',
    email: 'sarah@vingo.com',
    name: 'Sarah Jenkins',
    role: 'employee',
    title: 'Lead Full Stack Architect',
    department: 'Engineering',
    phone: '+1 (555) 872-9912',
    avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    join_date: '2023-03-01',
    salary: 125000,
    annual_leave_quota: 18,
    sick_leave_quota: 10,
    casual_leave_quota: 8,
    created_at: '2023-03-01T09:00:00Z',
    updated_at: '2026-10-19T09:00:00Z',
  },
  {
    id: 'user-mkt-004',
    email: 'rahul@vingo.com',
    name: 'Rahul Verma',
    role: 'employee',
    title: 'Product Marketing Manager',
    department: 'Marketing',
    phone: '+1 (555) 438-6623',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    join_date: '2023-08-15',
    salary: 88000,
    annual_leave_quota: 18,
    sick_leave_quota: 10,
    casual_leave_quota: 8,
    created_at: '2023-08-15T09:00:00Z',
    updated_at: '2026-10-19T09:00:00Z',
  },
  {
    id: 'user-ops-005',
    email: 'elena@vingo.com',
    name: 'Elena Rostova',
    role: 'employee',
    title: 'Client Operations Specialist',
    department: 'Operations',
    phone: '+1 (555) 761-3490',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    join_date: '2024-01-10',
    salary: 76000,
    annual_leave_quota: 18,
    sick_leave_quota: 10,
    casual_leave_quota: 8,
    created_at: '2024-01-10T09:00:00Z',
    updated_at: '2026-10-19T09:00:00Z',
  }
];

export const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead-001',
    title: 'Global Cloud Modernization & ERP Integration',
    company: 'Apex Logistics Inc.',
    contact_name: 'David Sterling',
    contact_email: 'd.sterling@apexlogistics.com',
    contact_phone: '+1 (555) 234-9811',
    value: 78500,
    currency: 'USD',
    stage: 'proposal',
    priority: 'urgent',
    source: 'inbound',
    assigned_to: 'user-sales-002',
    expected_close_date: '2026-11-15',
    notes: 'Client reviewed technical proposal. Budget approved for Q4 deployment. Waiting on final legal sign-off.',
    created_by: 'user-founder-001',
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-18T14:30:00Z',
  },
  {
    id: 'lead-002',
    title: 'Automated CRM & Customer Intelligence Platform',
    company: 'Vanguard Healthcare Tech',
    contact_name: 'Dr. Evelyn Reed',
    contact_email: 'ereed@vanguardhealth.io',
    contact_phone: '+1 (555) 441-2099',
    value: 120000,
    currency: 'USD',
    stage: 'qualified',
    priority: 'high',
    source: 'referral',
    assigned_to: 'user-sales-002',
    expected_close_date: '2026-12-01',
    notes: 'High intent. Needs HIPAA compliance questionnaire answered before contract drafting.',
    created_by: 'user-founder-001',
    created_at: '2026-10-05T11:20:00Z',
    updated_at: '2026-10-17T16:00:00Z',
  },
  {
    id: 'lead-003',
    title: 'Multi-Branch Inventory & Sales Sync Suite',
    company: 'Nordic Retail Group',
    contact_name: 'Marcus Lindqvist',
    contact_email: 'm.lindqvist@nordicretail.se',
    contact_phone: '+46 8 123 4567',
    value: 45000,
    currency: 'USD',
    stage: 'won',
    priority: 'medium',
    source: 'website',
    assigned_to: 'user-sales-002',
    expected_close_date: '2026-10-10',
    notes: 'Deal closed! Contract executed for 2-year subscription with initial onboarding kickoff.',
    created_by: 'user-sales-002',
    created_at: '2026-09-20T08:15:00Z',
    updated_at: '2026-10-10T12:00:00Z',
  },
  {
    id: 'lead-004',
    title: 'AI-Powered Lead Scoring & Follow-up Bot',
    company: 'HyperScale Media',
    contact_name: 'Chloe Zhang',
    contact_email: 'chloe@hyperscale.agency',
    contact_phone: '+1 (555) 902-3114',
    value: 32000,
    currency: 'USD',
    stage: 'contacted',
    priority: 'high',
    source: 'linkedin',
    assigned_to: 'user-mkt-004',
    expected_close_date: '2026-11-30',
    notes: 'Initial discovery call went great. Scheduled demo for upcoming Thursday at 3 PM EST.',
    created_by: 'user-founder-001',
    created_at: '2026-10-12T14:45:00Z',
    updated_at: '2026-10-16T11:00:00Z',
  },
  {
    id: 'lead-005',
    title: 'Omnichannel Support Desk & Ticketing System',
    company: 'Solaria FinTech Solutions',
    contact_name: 'Julian Vance',
    contact_email: 'jvance@solariafin.com',
    contact_phone: '+1 (555) 887-5421',
    value: 58000,
    currency: 'USD',
    stage: 'new',
    priority: 'medium',
    source: 'website',
    assigned_to: 'user-sales-002',
    expected_close_date: '2026-12-20',
    notes: 'Inbound demo request through main pricing calculator.',
    created_by: 'user-founder-001',
    created_at: '2026-10-18T10:00:00Z',
    updated_at: '2026-10-18T10:00:00Z',
  },
  {
    id: 'lead-006',
    title: 'Custom Internal Tooling & Reporting Engine',
    company: 'BlueWave Maritime Co.',
    contact_name: 'Captain Robert Ross',
    contact_email: 'r.ross@bluewave.org',
    contact_phone: '+1 (555) 776-9012',
    value: 28000,
    currency: 'USD',
    stage: 'lost',
    priority: 'low',
    source: 'cold_outreach',
    assigned_to: 'user-sales-002',
    expected_close_date: '2026-10-05',
    notes: 'Decided to postpone internal digitization until next fiscal year.',
    created_by: 'user-sales-002',
    created_at: '2026-09-15T09:30:00Z',
    updated_at: '2026-10-05T15:00:00Z',
  }
];

export const INITIAL_LEAD_ACTIVITIES: LeadActivity[] = [
  {
    id: 'act-001',
    lead_id: 'lead-001',
    user_id: 'user-sales-002',
    activity_type: 'reply',
    title: 'Client Feedback on Scope of Work',
    content: 'David Sterling replied: "We loved the architecture outline. Legal team had two questions regarding SLA guarantees and automated daily backups."',
    follow_up_date: '2026-10-22',
    created_at: '2026-10-16T15:30:00Z',
  },
  {
    id: 'act-002',
    lead_id: 'lead-001',
    user_id: 'user-sales-002',
    activity_type: 'call',
    title: 'Executive Alignment Call',
    content: '30 min call with VP of Engineering and David Sterling. Aligned on migration milestone schedule and Phase 1 pilot.',
    follow_up_date: '2026-10-25',
    created_at: '2026-10-17T11:00:00Z',
  },
  {
    id: 'act-003',
    lead_id: 'lead-002',
    user_id: 'user-sales-002',
    activity_type: 'email',
    title: 'HIPAA Security Whitepaper Transmitted',
    content: 'Sent SOC-2 Type II certificate and encryption in transit/rest documentation to Dr. Evelyn Reed.',
    follow_up_date: '2026-10-21',
    created_at: '2026-10-17T16:00:00Z',
  },
  {
    id: 'act-004',
    lead_id: 'lead-004',
    user_id: 'user-mkt-004',
    activity_type: 'meeting',
    title: 'Product Walkthrough & Demo',
    content: 'Showcased automated campaign triggers and AI lead scoring models. Team was impressed by ease of setup.',
    follow_up_date: '2026-10-23',
    created_at: '2026-10-18T14:00:00Z',
  }
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-001',
    user_id: 'user-founder-001',
    date: new Date().toISOString().split('T')[0],
    clock_in: '09:00:00',
    clock_out: null,
    total_hours: 4.5,
    status: 'present',
    notes: 'Executive strategy and quarterly planning',
    created_at: '2026-10-19T09:00:00Z',
  },
  {
    id: 'att-002',
    user_id: 'user-sales-002',
    date: new Date().toISOString().split('T')[0],
    clock_in: '09:12:00',
    clock_out: null,
    total_hours: 4.2,
    status: 'present',
    notes: 'Enterprise sales demos',
    created_at: '2026-10-19T09:12:00Z',
  },
  {
    id: 'att-003',
    user_id: 'user-eng-003',
    date: new Date().toISOString().split('T')[0],
    clock_in: '09:42:00',
    clock_out: null,
    total_hours: 3.5,
    status: 'late',
    notes: 'Delayed by network outage at morning transit',
    created_at: '2026-10-19T09:42:00Z',
  }
];

export const INITIAL_LEAVES: LeaveRecord[] = [
  {
    id: 'leave-001',
    user_id: 'user-sales-002',
    leave_type: 'annual',
    start_date: '2026-11-24',
    end_date: '2026-11-27',
    days_count: 4,
    reason: 'Thanksgiving family gathering and annual vacation.',
    status: 'pending',
    admin_remarks: null,
    reviewed_by: null,
    reviewed_at: null,
    created_at: '2026-10-15T10:00:00Z',
  },
  {
    id: 'leave-002',
    user_id: 'user-eng-003',
    leave_type: 'sick',
    start_date: '2026-10-02',
    end_date: '2026-10-02',
    days_count: 1,
    reason: 'Severe seasonal flu symptoms and rest.',
    status: 'approved',
    admin_remarks: 'Approved. Rest well and recover soon!',
    reviewed_by: 'user-founder-001',
    reviewed_at: '2026-10-02T09:30:00Z',
    created_at: '2026-10-02T08:00:00Z',
  },
  {
    id: 'leave-003',
    user_id: 'user-mkt-004',
    leave_type: 'casual',
    start_date: '2026-11-05',
    end_date: '2026-11-06',
    days_count: 2,
    reason: 'Family relocation and apartment shifting.',
    status: 'pending',
    admin_remarks: null,
    reviewed_by: null,
    reviewed_at: null,
    created_at: '2026-10-18T11:00:00Z',
  }
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-001',
    title: '🚀 Q4 Strategic Goals & $1.5M ARR Milestone All-Hands',
    content: 'Join us this Friday at 4 PM EST for our company all-hands. We will celebrate crossing our revenue targets, preview product roadmap releases, and unveil our enterprise expansion roadmap!',
    category: 'celebration',
    priority: 'important',
    is_pinned: true,
    target_department: 'all',
    created_by: 'user-founder-001',
    created_at: '2026-10-18T09:00:00Z',
  },
  {
    id: 'ann-002',
    title: '📢 Updated Health Insurance & Wellness Reimbursement Program',
    content: 'Effective November 1st, our corporate medical insurance covers vision, dental, psychological wellness, and a $60 monthly fitness allowance. Check your email for enrollment instructions.',
    category: 'policy',
    priority: 'important',
    is_pinned: true,
    target_department: 'all',
    created_by: 'user-founder-001',
    created_at: '2026-10-15T14:30:00Z',
  },
  {
    id: 'ann-003',
    title: '🎯 Sales Team Incentive & Deal Accelerator Boost',
    content: 'Congratulations to Alex Morgan on securing the Nordic Retail Group partnership! A 15% accelerator commission bonus is now unlocked for all contracts finalized before Thanksgiving.',
    category: 'celebration',
    priority: 'normal',
    is_pinned: false,
    target_department: 'sales',
    created_by: 'user-founder-001',
    created_at: '2026-10-12T16:00:00Z',
  },
  {
    id: 'ann-004',
    title: '🛠️ Scheduled Database Infrastructure Maintenance',
    content: 'Our cloud PostgreSQL replica will undergo scheduled index reindexing this Sunday between 02:00 AM and 03:00 AM UTC. Expected downtime is under 5 minutes.',
    category: 'urgent',
    priority: 'urgent',
    is_pinned: false,
    target_department: 'engineering',
    created_by: 'user-founder-001',
    created_at: '2026-10-17T12:00:00Z',
  }
];

export const INITIAL_POLICIES: Policy[] = [
  {
    id: 'pol-001',
    title: 'Company Code of Ethics & Professional Conduct',
    category: 'Code of Conduct',
    version: '2.1',
    effective_date: '2026-01-01',
    summary: 'Outlines standard ethical practices, zero-tolerance for harassment, mutual respect, and client data confidentiality.',
    content: `### 1. Purpose & Standards
At Vingo, our credibility is anchored in absolute trust, technological excellence, and moral integrity. Every team member is expected to uphold the highest standard of ethical conduct in all internal collaborations and external client partnerships.

### 2. Equal Opportunity & Harassment-Free Workplace
We provide an inclusive, safe, and welcoming environment for everyone, regardless of race, gender, sexual orientation, disability, or religious belief. Discrimination, verbal harassment, or retaliation will trigger immediate termination of contract.

### 3. Conflicts of Interest
Employees must not engage in external consulting or development that directly competes with Vingo or exploits company assets, source code repositories, or customer databases.

### 4. Whistleblower Protection
Reports of ethical or compliance violations are handled with strict anonymity and thorough independent inquiry.`,
    created_by: 'user-founder-001',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'pol-002',
    title: 'Remote & Hybrid Workplace Collaboration Standards',
    category: 'Remote Work',
    version: '1.4',
    effective_date: '2026-03-15',
    summary: 'Guidelines for core working hours, home office cybersecurity, synchronous communication, and hardware stipend.',
    content: `### 1. Core Synchronous Hours
Team members are required to be available on Slack and email during core collaborative hours: 10:00 AM to 4:00 PM local time.

### 2. Response Expectation
- Direct priority inquiries during core hours should receive a response within 60 minutes.
- Asynchronous updates (daily standup notes) must be logged before 10:30 AM.

### 3. Home Office & Device Security
- Company data must only be accessed through encrypted hardware using approved password managers.
- Public Wi-Fi networks must be routed through company VPN.`,
    created_by: 'user-founder-001',
    created_at: '2026-03-15T00:00:00Z',
    updated_at: '2026-03-15T00:00:00Z',
  },
  {
    id: 'pol-003',
    title: 'Information Security & Data Protection Policy',
    category: 'Security & IT',
    version: '3.0',
    effective_date: '2026-06-01',
    summary: 'Mandatory protocols for customer data handling, multi-factor authentication, incident reporting, and access keys.',
    content: `### 1. Mandatory Multi-Factor Authentication (MFA)
MFA is strictly required for Google Workspace, GitHub, Supabase, and our CRM platform.

### 2. Production Data Safeguards
- Production PostgreSQL database access is restricted via Row Level Security (RLS) and IP allowlists.
- Customer financial data and credentials must never be written to application console logs.

### 3. Security Breach Notification
Any suspected breach or lost work device must be reported to security@vingo.com within 60 minutes.`,
    created_by: 'user-founder-001',
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  },
  {
    id: 'pol-004',
    title: 'Paid Leave, Attendance & Absence Guidelines',
    category: 'Leave & Attendance',
    version: '2.0',
    effective_date: '2026-01-01',
    summary: 'Details annual leave allocations, vacation notice periods, medical sick certification, and daily clock-in rules.',
    content: `### 1. Annual Leave Entitlements
Full-time permanent employees receive:
- **18 Days Annual / Vacation Leave**
- **10 Days Sick Leave**
- **8 Days Casual / Emergency Leave**

### 2. Notice Timelines
- Vacations spanning 3+ consecutive workdays require at least 5 business days advance application through the Employee Portal.
- Emergency or sick leaves must be registered as early as possible on the day of absence.

### 3. Attendance Recording
Daily clock-in through the portal is required to maintain accurate timesheets, team visibility, and labor compliance.`,
    created_by: 'user-founder-001',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
];

export const INITIAL_HOLIDAYS: CompanyHoliday[] = [
  { id: 'hol-1', title: 'New Year Day', date: '2026-01-01', description: 'Welcoming the new year', is_mandatory: true, created_at: '2026-01-01' },
  { id: 'hol-2', title: 'Martin Luther King Jr. Day', date: '2026-01-19', description: 'Federal civil rights holiday', is_mandatory: true, created_at: '2026-01-01' },
  { id: 'hol-3', title: 'Presidents Day', date: '2026-02-16', description: 'Honoring American presidents', is_mandatory: true, created_at: '2026-01-01' },
  { id: 'hol-4', title: 'Memorial Day', date: '2026-05-25', description: 'Honoring fallen armed service personnel', is_mandatory: true, created_at: '2026-01-01' },
  { id: 'hol-5', title: 'Independence Day', date: '2026-07-04', description: 'National celebration of independence', is_mandatory: true, created_at: '2026-01-01' },
  { id: 'hol-6', title: 'Labor Day', date: '2026-09-07', description: 'Celebrating workers contributions', is_mandatory: true, created_at: '2026-01-01' },
  { id: 'hol-7', title: 'Thanksgiving Day', date: '2026-11-26', description: 'National day of gratitude and harvest', is_mandatory: true, created_at: '2026-01-01' },
  { id: 'hol-8', title: 'Day After Thanksgiving', date: '2026-11-27', description: 'Extended holiday weekend', is_mandatory: true, created_at: '2026-01-01' },
  { id: 'hol-9', title: 'Christmas Day', date: '2026-12-25', description: 'Winter holidays celebration', is_mandatory: true, created_at: '2026-01-01' },
];
