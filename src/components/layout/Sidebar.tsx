import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Kanban,
  Clock,
  CalendarCheck,
  Megaphone,
  FileText,
  Calendar,
  BarChart3,
  LogOut,
  Briefcase,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { user, logout, isAdmin } = useAuth();

  const closeMobile = () => setMobileOpen(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
      isActive
        ? 'bg-indigo-600/20 text-indigo-300 font-semibold border-l-4 border-indigo-500 shadow-sm'
        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
    }`;

  return (
    <aside
      className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-slate-950/95 border-r border-slate-800/80 flex flex-col transition-transform duration-300 backdrop-blur-xl ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Briefcase size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-none">VINGO</h1>
            <span className="text-[10px] tracking-widest uppercase font-semibold text-indigo-400">
              {isAdmin ? 'Founder Portal' : 'Employee Portal'}
            </span>
          </div>
        </div>
      </div>

      {/* Role Pill Banner */}
      <div className="mx-4 my-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">Role:</span>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
            isAdmin
              ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
              : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
          }`}
        >
          {isAdmin ? <ShieldCheck size={12} /> : <UserCheck size={12} />}
          {isAdmin ? 'Founder / Admin' : 'Employee'}
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Core Operations
        </div>

        <NavLink to="/" onClick={closeMobile} className={navLinkClass} end>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/leads" onClick={closeMobile} className={navLinkClass}>
          <Kanban size={18} />
          <span>{isAdmin ? 'Sales Pipeline' : 'Assigned Leads'}</span>
        </NavLink>

        <NavLink to="/attendance" onClick={closeMobile} className={navLinkClass}>
          <Clock size={18} />
          <span>{isAdmin ? 'Attendance Logs' : 'My Attendance & Clock'}</span>
        </NavLink>

        <NavLink to="/leaves" onClick={closeMobile} className={navLinkClass}>
          <CalendarCheck size={18} />
          <span>{isAdmin ? 'Leave Approvals' : 'Leave Requests'}</span>
        </NavLink>

        <NavLink to="/employees" onClick={closeMobile} className={navLinkClass}>
          <Users size={18} />
          <span>{isAdmin ? 'Employee Directory' : 'Team Directory'}</span>
        </NavLink>

        <div className="pt-3 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Organization & Policy
        </div>

        <NavLink to="/announcements" onClick={closeMobile} className={navLinkClass}>
          <Megaphone size={18} />
          <span>Announcements</span>
        </NavLink>

        <NavLink to="/policies" onClick={closeMobile} className={navLinkClass}>
          <FileText size={18} />
          <span>Policies & Handbook</span>
        </NavLink>

        <NavLink to="/holidays" onClick={closeMobile} className={navLinkClass}>
          <Calendar size={18} />
          <span>Holidays Calendar</span>
        </NavLink>

        {isAdmin && (
          <>
            <div className="pt-3 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Executive Intel
            </div>

            <NavLink to="/reports" onClick={closeMobile} className={navLinkClass}>
              <BarChart3 size={18} />
              <span>Executive Reports</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* Bottom User Card */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/50 border border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'User'}`}
              alt={user?.name}
              className="w-9 h-9 rounded-full object-cover border border-slate-700 flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.title}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
