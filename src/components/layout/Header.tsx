import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Menu, Clock, Database, Sparkles, CheckCircle2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface HeaderProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ mobileOpen, setMobileOpen }) => {
  const { user, demoSwitch, isSupabaseConfigured, isAdmin } = useAuth();
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const location = useLocation();

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return isAdmin ? 'Founder / Executive Command Center' : 'My Employee Dashboard';
    if (path.startsWith('/leads/dead')) return 'Dead & Inactive Leads';
    if (path.startsWith('/leads/followups')) return 'Scheduled Sales Follow-ups';
    if (path.startsWith('/leads/my')) return 'My Assigned Sales Opportunities';
    if (path.startsWith('/leads')) return isAdmin ? 'Sales Lead Pipeline' : 'My Leads';
    if (path.startsWith('/email/replies')) return 'Inbound Prospect Email Replies';
    if (path.startsWith('/attendance')) return isAdmin ? 'Company Attendance Management' : 'My Attendance & Clock-in';
    if (path.startsWith('/leaves/apply')) return 'Apply for Leave';
    if (path.startsWith('/leaves/history')) return 'My Leave Submissions & History';
    if (path.startsWith('/leaves')) return isAdmin ? 'Employee Leave Approvals' : 'My Leave Requests';
    if (path.startsWith('/employees')) return 'Employee Directory & Staff Management';
    if (path.startsWith('/announcements')) return 'Company Announcements & Broadcasts';
    if (path.startsWith('/policies')) return 'Company Policies & Compliance Handbook';
    if (path.startsWith('/holidays')) return 'Corporate Holiday Calendar (2026 - 2027)';
    if (path.startsWith('/notifications')) return 'System Notifications & Alerts';
    if (path.startsWith('/reports')) return 'Executive Analytics & Performance';
    if (path.startsWith('/activity-logs')) return 'Security Audit & Activity Logs';
    if (path.startsWith('/settings')) return 'Platform & Role Governance Settings';
    if (path.startsWith('/profile')) return 'My Employee Profile';
    return 'Vingo Enterprise CRM';
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          <Menu size={20} />
        </button>
        <h2 className="text-lg font-bold text-white tracking-tight">{getPageTitle()}</h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Demo Switcher */}
        <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 px-2">Switch:</span>
          <button
            onClick={() => demoSwitch('founder@vingo.com')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              user?.email === 'founder@vingo.com'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            👑 Founder
          </button>
          <button
            onClick={() => demoSwitch('alex@vingo.com')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              user?.email === 'alex@vingo.com'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            💼 Alex (Sales)
          </button>
          <button
            onClick={() => demoSwitch('sarah@vingo.com')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              user?.email === 'sarah@vingo.com'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            💻 Sarah (Eng)
          </button>
        </div>

        {/* Database Status Badge */}
        <div
          title={
            isSupabaseConfigured
              ? 'Connected to Supabase PostgreSQL with Row Level Security'
              : 'Running in interactive mode with full mock persistence. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to link live cloud DB.'
          }
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border cursor-help ${
            isSupabaseConfigured
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
          }`}
        >
          {isSupabaseConfigured ? <CheckCircle2 size={13} /> : <Database size={13} />}
          <span className="hidden md:inline">
            {isSupabaseConfigured ? 'Supabase Live' : 'Supabase Ready'}
          </span>
        </div>

        {/* Live Clock Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-300">
          <Clock size={13} />
          <span>{time}</span>
        </div>
      </div>
    </header>
  );
};
