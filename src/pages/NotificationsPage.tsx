import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { crmService } from '../services/crmService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AppNotification, NotificationType } from '../types/database';
import { PageContainer } from '../components/layout/PageContainer';
import { formatDateTime } from '../lib/utils';
import {
  Bell,
  CheckCircle2,
  CheckCheck,
  UserCheck,
  Flame,
  Unlock,
  Clock,
  MailCheck,
  CalendarCheck,
  CalendarDays,
  Megaphone,
  FileText,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Inbox
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { user, showToast } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'leads' | 'hr' | 'broadcasts'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadNotifications = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [list, count] = await Promise.all([
        crmService.getNotifications(user.id),
        crmService.getUnreadNotificationCount(user.id)
      ]);
      setNotifications(list);
      setUnreadCount(count);
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
      showToast('Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Supabase Realtime subscription for real-time notification delivery
    if (isSupabaseConfigured && user) {
      const channel = supabase
        .channel(`user-notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const newNotif = payload.new as AppNotification;
            setNotifications((prev) => [newNotif, ...prev]);
            setUnreadCount((prev) => prev + 1);
            showToast(`🔔 ${newNotif.title}`, 'info');
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) return;
    try {
      await crmService.markNotificationAsRead(id, user.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      showToast('Notification marked as read', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update notification', 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    try {
      await crmService.markAllNotificationsAsRead(user.id);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
      showToast('All notifications marked as read', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to mark all as read', 'error');
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.is_read && user) {
      await handleMarkAsRead(notif.id);
    }
    if (notif.link && notif.link !== '#') {
      navigate(notif.link);
    }
  };

  // Icon and theme mapping for notification types
  const getTypeMeta = (type: NotificationType) => {
    switch (type) {
      case 'lead_assigned':
        return {
          icon: UserCheck,
          color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
          label: 'Lead Assigned'
        };
      case 'dead_lead_claimed':
        return {
          icon: Flame,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          label: 'Dead Lead Claimed'
        };
      case 'dead_lead_unlocked':
        return {
          icon: Unlock,
          color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
          label: 'Lock Released'
        };
      case 'followup_due':
        return {
          icon: Clock,
          color: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
          label: 'Follow-up Due'
        };
      case 'reply_recorded':
        return {
          icon: MailCheck,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          label: 'New Buyer Reply'
        };
      case 'leave_reviewed':
        return {
          icon: CalendarCheck,
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
          label: 'Leave Decision'
        };
      case 'leave_applied':
        return {
          icon: CalendarDays,
          color: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
          label: 'Leave Submission'
        };
      case 'notice_published':
        return {
          icon: Megaphone,
          color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
          label: 'Company Broadcast'
        };
      case 'policy_updated':
        return {
          icon: FileText,
          color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
          label: 'Policy Update'
        };
      case 'attendance_exception':
        return {
          icon: AlertTriangle,
          color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
          label: 'Attendance Exception'
        };
      case 'admin_override':
        return {
          icon: ShieldAlert,
          color: 'text-red-400 bg-red-500/10 border-red-500/20',
          label: 'Admin Override'
        };
      default:
        return {
          icon: Bell,
          color: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
          label: 'System Notification'
        };
    }
  };

  // Filter items
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'unread' && n.is_read) return false;
    if (activeTab === 'leads' && !['lead_assigned', 'dead_lead_claimed', 'dead_lead_unlocked', 'followup_due', 'reply_recorded'].includes(n.type)) {
      return false;
    }
    if (activeTab === 'hr' && !['leave_reviewed', 'leave_applied', 'attendance_exception'].includes(n.type)) {
      return false;
    }
    if (activeTab === 'broadcasts' && !['notice_published', 'policy_updated'].includes(n.type)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <PageContainer
      title="In-App Notifications & Alerts"
      description="Persistent, realtime notifications for assigned leads, follow-ups, policy updates, and attendance alerts."
    >
      <div className="space-y-6">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="relative p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {unreadCount === 0 ? 'All caught up' : `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`}
              </h3>
              <p className="text-xs text-slate-400">
                Delivered in realtime via Supabase Realtime & persisted in PostgreSQL.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                unreadCount > 0
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-slate-600 shadow-sm cursor-pointer'
                  : 'bg-slate-900 text-slate-600 border-slate-800/60 cursor-not-allowed'
              }`}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all as read
            </button>
            <button
              onClick={loadNotifications}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/80 border border-slate-800 overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === 'unread'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500/80 text-white text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === 'leads'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Pipeline & Sales
            </button>
            <button
              onClick={() => setActiveTab('hr')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === 'hr'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              HR & Leaves
            </button>
            <button
              onClick={() => setActiveTab('broadcasts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === 'broadcasts'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Broadcasts & Policies
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-colors"
            />
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-8 h-8 mx-auto mb-3 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-xs font-medium">Syncing notification channel...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-16 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center">
            <Inbox className="w-10 h-10 mx-auto text-slate-600 mb-3" />
            <h4 className="text-sm font-semibold text-slate-300">No notifications found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {activeTab === 'unread'
                ? 'Great job! You have read all notifications in your inbox.'
                : 'No alerts matching your current filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notif) => {
              const meta = getTypeMeta(notif.type);
              const Icon = meta.icon;

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative p-4 rounded-2xl border transition-all cursor-pointer ${
                    !notif.is_read
                      ? 'bg-slate-900/90 border-indigo-500/30 hover:border-indigo-500/60 shadow-lg shadow-indigo-950/20'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700/80 hover:bg-slate-900/60'
                  }`}
                >
                  {/* Read/Unread Indicator Pill */}
                  {!notif.is_read && (
                    <span className="absolute top-4 right-4 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500" />
                    </span>
                  )}

                  <div className="flex items-start gap-3.5">
                    {/* Notification Type Icon */}
                    <div className={`p-2.5 rounded-xl border shrink-0 ${meta.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0 pr-8">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-semibold text-slate-300">
                          {meta.label}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {formatDateTime(notif.created_at)}
                        </span>
                      </div>

                      <h4
                        className={`text-sm tracking-tight ${
                          !notif.is_read ? 'font-semibold text-white' : 'font-medium text-slate-300'
                        }`}
                      >
                        {notif.title}
                      </h4>

                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {notif.message}
                      </p>

                      {/* Footer Actions */}
                      <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-slate-800/60 text-xs">
                        {notif.link && notif.link !== '#' && (
                          <span className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                            Open Destination
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        )}

                        {!notif.is_read ? (
                          <button
                            onClick={(e) => handleMarkAsRead(notif.id, e)}
                            className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            Mark as read
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] flex items-center gap-1 font-mono">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Read {notif.read_at ? formatDateTime(notif.read_at) : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default NotificationsPage;
