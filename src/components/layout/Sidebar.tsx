import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarCheck,
  Calendar,
  Kanban,
  ArchiveX,
  MailCheck,
  CalendarClock,
  Megaphone,
  FileText,
  Bell,
  BarChart3,
  History,
  Settings,
  User,
  CalendarPlus,
  Briefcase,
  ShieldCheck,
  UserCheck,
  LogOut,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { user, logout, isAdmin, isFounderAdmin } = useAuth();

  const closeMobile = () => setMobileOpen(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
      isActive
        ? 'bg-indigo-600/20 text-indigo-300 font-semibold border-l-4 border-indigo-500 shadow-sm'
        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
    }`;

  // 15 Founder/Admin Navigation Items
  const founderNav = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, exact: true },
    { label: 'Employees', path: '/employees', icon: Users },
    { label: 'Attendance', path: '/attendance', icon: Clock },
    { label: 'Leave Management', path: '/leaves', icon: CalendarCheck },
    { label: 'Holidays', path: '/holidays', icon: Calendar },
    { label: 'Lead Pipeline', path: '/leads', icon: Kanban, exact: true },
    { label: 'Dead Leads', path: '/leads/dead', icon: ArchiveX },
    { label: 'Email Replies', path: '/email/replies', icon: MailCheck },
    { label: 'Follow-ups', path: '/leads/followups', icon: CalendarClock },
    { label: 'Important Notices', path: '/announcements', icon: Megaphone },
    { label: 'Company Policies', path: '/policies', icon: FileText },
    { label: 'Notifications', path: '/notifications', icon: Bell },
    { label: 'Reports', path: '/reports', icon: BarChart3 },
    { label: 'Activity Logs', path: '/activity-logs', icon: History },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  // 13 Employee Navigation Items
  const employeeNav = [
    { label: 'My Dashboard', path: '/', icon: LayoutDashboard, exact: true },
    { label: 'My Profile', path: '/profile', icon: User },
    { label: 'My Attendance', path: '/attendance', icon: Clock },
    { label: 'Apply for Leave', path: '/leaves/apply', icon: CalendarPlus },
    { label: 'My Leave History', path: '/leaves/history', icon: CalendarCheck },
    { label: 'Holidays Calendar', path: '/holidays', icon: Calendar },
    { label: 'My Leads', path: '/leads/my', icon: Kanban },
    { label: 'Dead Leads', path: '/leads/dead', icon: ArchiveX },
    { label: 'Email Replies', path: '/email/replies', icon: MailCheck },
    { label: 'Follow-ups', path: '/leads/followups', icon: CalendarClock },
    { label: 'Important Notices', path: '/announcements', icon: Megaphone },
    { label: 'Company Policies', path: '/policies', icon: FileText },
    { label: 'Notifications', path: '/notifications', icon: Bell },
  ];

  const currentNav = isAdmin ? founderNav : employeeNav;

  return (
    <aside
      className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-slate-950/95 border-r border-slate-800/80 flex flex-col transition-transform duration-300 backdrop-blur-xl ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-none font-heading">
              VINGO
            </h1>
            <span className="text-[10px] tracking-widest uppercase font-semibold text-indigo-400">
              {isAdmin ? 'Founder Portal' : 'Employee Portal'}
            </span>
          </div>
        </div>
      </div>

      {/* Role Pill Banner */}
      <div className="mx-3 my-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 font-medium">Access:</span>
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            isFounderAdmin
              ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
              : isAdmin
              ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
              : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
          }`}
        >
          {isAdmin ? <ShieldCheck className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
          {isFounderAdmin ? '👑 Founder' : isAdmin ? 'Admin' : 'Employee'}
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-2.5 py-1.5 space-y-0.5 overflow-y-auto">
        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {isAdmin ? 'Management Modules' : 'Workspace Navigation'}
        </div>

        {currentNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path + item.label}
              to={item.path}
              end={item.exact}
              onClick={closeMobile}
              className={navLinkClass}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom User Card */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/50 border border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'User'}`}
              alt={user?.name}
              className="w-8 h-8 rounded-full object-cover border border-slate-700 flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.title}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Log out of session"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
