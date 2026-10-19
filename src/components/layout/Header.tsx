import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { crmService } from '../../services/crmService';
import { supabase } from '../../lib/supabase';
import { AppNotification } from '../../types/database';
import { Menu, Clock, Database, CheckCircle2, Bell, CheckCheck, ArrowRight, Sparkles } from 'lucide-react';
import { useLocation, useNavigate, Link } from 'react-router-dom';

interface HeaderProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ mobileOpen, setMobileOpen }) => {
  const { user, demoSwitch, isSupabaseConfigured, isAdmin, showToast } = useAuth();
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifs, setRecentNotifs] = useState<AppNotification[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchNotifs = async () => {
    if (!user) return;
    try {
      const [count, list] = await Promise.all([
        crmService.getUnreadNotificationCount(user.id),
        crmService.getNotifications(user.id)
      ]);
      setUnreadCount(count);
      setRecentNotifs(list.slice(0, 5));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000); // Poll every 10s as backup

    if (isSupabaseConfigured && user) {
      const channel = supabase
        .channel(`header-notifs-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchNotifs();
          }
        )
        .subscribe();

      return () => {
        clearInterval(interval);
        supabase.removeChannel(channel);
      };
    }

    return () => clearInterval(interval);
  }, [user]);

  // Click outside listener for dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await crmService.markAllNotificationsAsRead(user.id);
      setUnreadCount(0);
      setRecentNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
      showToast('All notifications marked as read', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to mark as read', 'error');
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!user) return;
    if (!notif.is_read) {
      await crmService.markNotificationAsRead(notif.id, user.id);
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setDropdownOpen(false);
    if (notif.link && notif.link !== '#') {
      navigate(notif.link);
    }
  };

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

        {/* Notification Bell Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="notification-bell-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`relative p-2 rounded-xl border transition-all ${
              dropdownOpen
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown Panel */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
                  >
                    <CheckCheck size={12} />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/50">
                {recentNotifs.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-medium">No notifications yet</p>
                  </div>
                ) : (
                  recentNotifs.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3 transition-colors cursor-pointer hover:bg-slate-900/80 ${
                        !notif.is_read ? 'bg-indigo-950/20' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {!notif.is_read ? (
                          <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-700 shrink-0 mt-1.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs leading-snug truncate ${
                              !notif.is_read ? 'font-semibold text-white' : 'font-normal text-slate-300'
                            }`}
                          >
                            {notif.title}
                          </p>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                            {notif.message}
                          </p>
                          <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 border-t border-slate-800 bg-slate-900/60 text-center">
                <Link
                  to="/notifications"
                  onClick={() => setDropdownOpen(false)}
                  className="text-xs font-medium text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 transition-colors"
                >
                  View All Notifications
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          )}
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

