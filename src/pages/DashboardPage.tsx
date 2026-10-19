import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { crmService } from '../services/crmService';
import { DashboardStats, AttendanceRecord, Lead, Announcement, Policy } from '../types/database';
import { formatCurrency, formatDate } from '../lib/utils';
import {
  Users,
  Clock,
  Kanban,
  DollarSign,
  CalendarCheck,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  PhoneCall,
  Calendar,
  Briefcase
} from 'lucide-react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';

export const DashboardPage: React.FC = () => {
  const { user, isAdmin, showToast } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<{
    myRecord: AttendanceRecord | null;
    allToday: AttendanceRecord[];
  }>({ myRecord: null, allToday: [] });
  const [myLeads, setMyLeads] = useState<Lead[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [clockNotes, setClockNotes] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashStats, attData, leadsData, annData, polData] = await Promise.all([
        crmService.getDashboardStats(),
        crmService.getTodayAttendance(user?.id || ''),
        crmService.getLeads(),
        crmService.getAnnouncements(),
        crmService.getPolicies(user?.id || '')
      ]);

      setStats(dashStats);
      setTodayAttendance(attData);
      setMyLeads(leadsData.filter((l) => isAdmin || l.assigned_to === user?.id));
      setAnnouncements(annData.slice(0, 3));
      setPolicies(polData);
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, isAdmin]);

  const handleClockIn = async () => {
    if (!user) return;
    try {
      setActionLoading(true);
      const rec = await crmService.clockIn(user.id, clockNotes);
      setTodayAttendance((prev) => ({ ...prev, myRecord: rec }));
      showToast(`Clocked in successfully at ${rec.clock_in}!`, 'success');
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      setClockNotes('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Clock-in failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!user) return;
    try {
      setActionLoading(true);
      const rec = await crmService.clockOut(user.id, clockNotes);
      setTodayAttendance((prev) => ({ ...prev, myRecord: rec }));
      showToast(`Clocked out at ${rec.clock_out}. Total hours: ${rec.total_hours}h`, 'info');
      setClockNotes('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Clock-out failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const myRecord = todayAttendance.myRecord;
  const isClockedIn = Boolean(myRecord && myRecord.clock_in && !myRecord.clock_out);
  const isClockedOut = Boolean(myRecord && myRecord.clock_out);

  const pendingPolicyCount = policies.filter((p) => !p.my_acknowledged_at).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner / Daily Clock Action */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 p-6 lg:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
              <Sparkles size={13} />
              <span>{isAdmin ? 'Executive Administration' : `${user?.department} Department`}</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.name}
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              {isAdmin
                ? 'Overview of company attendance, active sales pipeline deals, pending leave approvals, and employee operations.'
                : 'Here is your daily workspace snapshot, attendance status, assigned sales leads, and team announcements.'}
            </p>
          </div>

          {/* Quick Attendance Widget */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-center gap-4">
            <div className="text-center sm:text-left">
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Today's Punch</p>
              <p className="text-lg font-bold text-white">
                {isClockedIn ? (
                  <span className="text-emerald-400 flex items-center gap-1.5 justify-center sm:justify-start">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    In: {myRecord?.clock_in}
                  </span>
                ) : isClockedOut ? (
                  <span className="text-cyan-400">
                    Done ({myRecord?.total_hours} hrs)
                  </span>
                ) : (
                  <span className="text-amber-400">Not Clocked In</span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!isClockedIn && !isClockedOut && (
                <button
                  onClick={handleClockIn}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2"
                >
                  <Clock size={15} />
                  <span>Clock In</span>
                </button>
              )}
              {isClockedIn && (
                <button
                  onClick={handleClockOut}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all shadow-lg shadow-rose-600/30 flex items-center gap-2"
                >
                  <Clock size={15} />
                  <span>Clock Out</span>
                </button>
              )}
              <Link
                to="/attendance"
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Log
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/40 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isAdmin ? 'Active Team' : 'My Department'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-white">
              {isAdmin ? stats?.employees.active || 0 : user?.department}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {isAdmin
                ? `${stats?.employees.total || 0} total on payroll`
                : `${user?.title}`}
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Clocked In Today
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-white">
              {stats?.attendanceToday.clockedIn || 0} / {stats?.attendanceToday.totalActiveEmployees || 0}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {stats?.attendanceToday.lateArrivals ? (
                <span className="text-amber-400 font-semibold">{stats.attendanceToday.lateArrivals} late arrival(s)</span>
              ) : (
                <span className="text-emerald-400">100% on time</span>
              )}
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isAdmin ? 'Pipeline Value' : 'My Active Deals'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-white">
              {formatCurrency(
                isAdmin
                  ? stats?.pipeline.pipelineValue || 0
                  : myLeads.reduce((acc, l) => acc + (l.value || 0), 0)
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {isAdmin
                ? `${stats?.pipeline.wonCount || 0} deals won (${formatCurrency(stats?.pipeline.wonRevenue || 0)})`
                : `${myLeads.length} leads assigned`}
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-amber-500/40 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isAdmin ? 'Pending Leaves' : 'Leave Balance'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <CalendarCheck size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-white">
              {isAdmin ? (
                stats?.pendingLeavesCount || 0
              ) : (
                `${user?.annual_leave_quota || 18} Days`
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {isAdmin ? (
                <Link to="/leaves" className="text-amber-400 hover:underline">
                  Review applications &rarr;
                </Link>
              ) : (
                `Annual: ${user?.annual_leave_quota} | Sick: ${user?.sick_leave_quota}`
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Leads Pipeline & Team Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Sales Pipeline Deals Overview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-white">
                  {isAdmin ? 'Sales Lead Pipeline' : 'My Active Assigned Leads'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isAdmin
                    ? 'Active revenue pipeline across all sales stages'
                    : 'Leads assigned to your account requiring follow-up'}
                </p>
              </div>
              <Link
                to="/leads"
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <span>Full Board</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* Stage Progress Breakdown */}
            {isAdmin && stats?.pipeline.stageBreakdown && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
                {stats.pipeline.stageBreakdown.map((s) => (
                  <div key={s.stage} className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400">{s.stage}</span>
                    <p className="text-base font-bold text-white mt-0.5">{s.count}</p>
                    <p className="text-[10px] text-emerald-400">{formatCurrency(s.total_value)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Leads Table Snippet */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-3">Deal / Opportunity</th>
                    <th className="pb-3">Company</th>
                    <th className="pb-3">Value</th>
                    <th className="pb-3">Stage</th>
                    <th className="pb-3">Priority</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {myLeads.slice(0, 5).map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 font-semibold text-white max-w-[180px] truncate">
                        {lead.title}
                      </td>
                      <td className="py-3 text-slate-300">{lead.company}</td>
                      <td className="py-3 font-bold text-emerald-400">{formatCurrency(lead.value)}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                          {lead.stage}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            lead.priority === 'urgent'
                              ? 'bg-rose-500/20 text-rose-300'
                              : lead.priority === 'high'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {lead.priority}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          to={`/leads`}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                          Open &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {myLeads.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        No assigned leads in your queue.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Company Announcements Feed */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Company Announcements</span>
                {announcements.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                    Latest
                  </span>
                )}
              </h3>
              <Link to="/announcements" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                View All &rarr;
              </Link>
            </div>

            <div className="space-y-3">
              {announcements.map((ann) => (
                <div key={ann.id} className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-white">{ann.title}</h4>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                      {ann.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 line-clamp-2 leading-relaxed">{ann.content}</p>
                  <p className="text-[10px] text-slate-500 mt-2">Posted by {ann.author?.name || 'Founder'} &bull; {formatDate(ann.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Today's Attendance & Compliance */}
        <div className="space-y-6">
          {/* Attendance Tracker Widget */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Who Is In Today</h3>
              <Link to="/attendance" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                Details &rarr;
              </Link>
            </div>

            <div className="space-y-3">
              {todayAttendance.allToday.slice(0, 5).map((att) => (
                <div key={att.user_id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/30 border border-slate-800/60">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={att.profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${att.profile?.name}`}
                      alt={att.profile?.name}
                      className="w-8 h-8 rounded-full object-cover border border-slate-700"
                    />
                    <div>
                      <p className="text-xs font-semibold text-white leading-tight">{att.profile?.name}</p>
                      <p className="text-[10px] text-slate-400">{att.profile?.title}</p>
                    </div>
                  </div>
                  <div>
                    {att.clock_in ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {att.clock_in}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500">Absent</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Policy Compliance Tracker Card */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h3 className="text-base font-bold text-white mb-2">Policy Sign-off Status</h3>
            <p className="text-xs text-slate-400 mb-4">
              Company-wide compliance with corporate policies and employee handbooks.
            </p>

            {pendingPolicyCount > 0 ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
                <AlertCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-300">
                    {pendingPolicyCount} Policy Requiring Signature
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Please review and acknowledge newly issued company guidelines.
                  </p>
                  <Link
                    to="/policies"
                    className="inline-block text-xs font-bold text-amber-400 hover:text-amber-300 mt-2"
                  >
                    Review Policies &rarr;
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-3">
                <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-300">100% Fully Compliant</h4>
                  <p className="text-[11px] text-slate-300">All required company policies have been signed.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
