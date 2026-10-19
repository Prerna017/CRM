import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { crmService } from '../services/crmService';
import { AttendanceRecord, AttendanceStatus, UserProfile, CompanySettings } from '../types/database';
import { formatDate } from '../lib/utils';
import {
  Clock,
  Calendar,
  Download,
  Plus,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Users,
  Search,
  ShieldAlert,
  Edit3,
  Globe,
  Sliders,
  History,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const AttendancePage: React.FC = () => {
  const { user, isAdmin, showToast } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [clockLoading, setClockLoading] = useState(false);
  const [notes, setNotes] = useState('');

  // Filters (Admin view)
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // Regularize Modal (Admin)
  const [regularizeOpen, setRegularizeOpen] = useState(false);
  const [regUserId, setRegUserId] = useState('');
  const [regDate, setRegDate] = useState(new Date().toISOString().split('T')[0]);
  const [regClockIn, setRegClockIn] = useState('09:00:00');
  const [regClockOut, setRegClockOut] = useState('18:00:00');
  const [regStatus, setRegStatus] = useState<AttendanceStatus>('present');
  const [regReason, setRegReason] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [todayData, emps, settings] = await Promise.all([
        crmService.getTodayAttendance(user?.id || ''),
        crmService.getEmployees(user?.id),
        crmService.getSettings()
      ]);
      setTodayRecord(todayData.myRecord);
      setEmployees(emps);
      setCompanySettings(settings);
      if (emps.length > 0 && !regUserId) {
        setRegUserId(emps[0].id);
      }

      if (isAdmin) {
        const adminAtt = await crmService.getAdminAttendance();
        setAttendance(adminAtt);
      } else {
        const myAtt = await crmService.getMyAttendanceHistory(user?.id || '');
        setAttendance(myAtt);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user, isAdmin]);

  const handleClockIn = async () => {
    if (!user) return;
    try {
      setClockLoading(true);
      const rec = await crmService.clockIn(user.id, notes);
      setTodayRecord(rec);
      showToast(
        rec.is_late
          ? `Clocked in at ${rec.clock_in} (Marked Late as arrival was past grace period)`
          : `Clocked in on time at ${rec.clock_in}!`,
        rec.is_late ? 'info' : 'success'
      );
      if (!rec.is_late) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      }
      setNotes('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Clock in failed', 'error');
    } finally {
      setClockLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!user) return;
    try {
      setClockLoading(true);
      const rec = await crmService.clockOut(user.id, notes);
      setTodayRecord(rec);
      showToast(`Clocked out at ${rec.clock_out}. Total hours: ${rec.total_hours} hrs`, 'info');
      setNotes('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Clock out failed', 'error');
    } finally {
      setClockLoading(false);
    }
  };

  const handleRegularizeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUserId || !regDate || !regReason.trim()) {
      showToast('Employee, Date, and Correction Reason are required', 'error');
      return;
    }

    try {
      await crmService.regularizeAttendance(user?.id || 'user-founder-001', {
        user_id: regUserId,
        date: regDate,
        clock_in: regClockIn,
        clock_out: regClockOut,
        status: regStatus,
        correction_reason: regReason.trim()
      });

      showToast('Attendance record regularized and audited successfully', 'success');
      setRegularizeOpen(false);
      setRegReason('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Regularization failed', 'error');
    }
  };

  const handleExportCsv = () => {
    try {
      const csvString = crmService.exportAttendanceCsv(filteredAttendance);
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `vingo_attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Attendance report exported to CSV', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to export CSV', 'error');
    }
  };

  const filteredAttendance = attendance.filter((rec) => {
    if (selectedUser !== 'all' && rec.user_id !== selectedUser) return false;
    if (selectedStatus !== 'all' && rec.status !== selectedStatus) return false;
    if (dateFilter && rec.date !== dateFilter) return false;
    return true;
  });

  const missingCheckoutCount = attendance.filter((a) => a.status === 'missing_checkout').length;
  const lateArrivalsCount = attendance.filter((a) => a.is_late || a.status === 'late').length;
  const totalHoursAccumulated = attendance.reduce((sum, a) => sum + (a.total_hours || 0), 0);

  const getStatusBadge = (status: AttendanceStatus, isLate?: boolean, isEarly?: boolean) => {
    switch (status) {
      case 'present':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            <CheckCircle2 size={11} />
            Present
          </span>
        );
      case 'late':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
            <AlertCircle size={11} />
            Late Arrival
          </span>
        );
      case 'half_day':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/25">
            Half Day
          </span>
        );
      case 'missing_checkout':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <AlertTriangle size={11} />
            Missing Check-out
          </span>
        );
      case 'on_leave':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/25">
            On Leave
          </span>
        );
      case 'absent':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            Absent
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner / Company Policy Rules */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              {isAdmin ? 'Attendance Management & Verification' : 'My Daily Timesheet & Clock In'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Live Rules Engine
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Automated timesheets with company working hour rules, late arrival threshold, and audited regularizations.
          </p>
        </div>

        {/* Company Settings Pill */}
        {companySettings && (
          <div className="flex flex-wrap items-center gap-3 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Globe size={13} className="text-indigo-400" />
              <span>Timezone: <strong>{companySettings.timezone}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300 border-l border-slate-800 pl-3">
              <Clock size={13} className="text-indigo-400" />
              <span>Hours: <strong>{companySettings.work_start_time.slice(0, 5)} - {companySettings.work_end_time.slice(0, 5)}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300 border-l border-slate-800 pl-3">
              <ShieldAlert size={13} className="text-amber-400" />
              <span>Late Grace: <strong>{companySettings.late_threshold_minutes} min</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Missing Check-out Alert Warning if applicable */}
      {missingCheckoutCount > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-300">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="text-amber-400 shrink-0" />
            <div>
              <strong className="font-bold">Missing Check-Outs Detected:</strong> {missingCheckoutCount} shift(s) are missing punch-out records and have been flagged for manager/admin review.
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => {
                setSelectedStatus('missing_checkout');
              }}
              className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 font-semibold text-[11px] text-amber-200"
            >
              Filter Missing Checkouts
            </button>
          )}
        </div>
      )}

      {/* TODAY'S CLOCK ACTION CARD */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="text-indigo-400 animate-pulse" size={20} />
              <h2 className="text-lg font-bold text-white">Daily Punch Terminal</h2>
              <span className="text-xs text-slate-400 font-mono">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              Punch in at the start of your workday. Your attendance status is derived directly from verified company timestamps and policy thresholds.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <div className="bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Today's Clock In</span>
                <span className="text-sm font-mono font-bold text-white">
                  {todayRecord?.clock_in || '--:--:--'}
                </span>
              </div>

              <div className="bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Today's Clock Out</span>
                <span className="text-sm font-mono font-bold text-white">
                  {todayRecord?.clock_out || '--:--:--'}
                </span>
              </div>

              <div className="bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Shift Hours</span>
                <span className="text-sm font-mono font-bold text-emerald-400">
                  {todayRecord?.total_hours ? `${todayRecord.total_hours} hrs` : '0.0 hrs'}
                </span>
              </div>

              <div className="bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Daily Status</span>
                <div className="mt-0.5">
                  {todayRecord ? getStatusBadge(todayRecord.status, todayRecord.is_late, todayRecord.is_early_departure) : (
                    <span className="text-xs text-slate-500 font-medium">Not Clocked In</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2.5 min-w-[200px]">
            <input
              type="text"
              placeholder="Add optional shift note..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />

            {!todayRecord?.clock_in ? (
              <button
                onClick={handleClockIn}
                disabled={clockLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Clock size={16} />
                <span>{clockLoading ? 'Recording Clock-in...' : 'Clock In Now'}</span>
              </button>
            ) : !todayRecord?.clock_out ? (
              <button
                onClick={handleClockOut}
                disabled={clockLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Clock size={16} />
                <span>{clockLoading ? 'Punching Out...' : 'Clock Out (End Shift)'}</span>
              </button>
            ) : (
              <div className="py-2.5 px-4 rounded-xl bg-slate-800/80 border border-slate-700 text-center text-xs text-slate-300 font-medium flex items-center justify-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>Shift Completed Today</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
            <History size={22} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">Total Shift Hours Logged</span>
            <span className="text-xl font-extrabold text-white">{totalHoursAccumulated.toFixed(1)} hrs</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <AlertCircle size={22} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">Late Arrivals Flagged</span>
            <span className="text-xl font-extrabold text-white">{lateArrivalsCount} shift(s)</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">Total Records in View</span>
            <span className="text-xl font-extrabold text-white">{filteredAttendance.length} entries</span>
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Employees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.employee_id || e.department})
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="present">Present</option>
            <option value="late">Late Arrival</option>
            <option value="half_day">Half Day</option>
            <option value="missing_checkout">Missing Check-out</option>
            <option value="on_leave">On Leave</option>
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
          />

          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              Clear Date
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* CSV Export Button */}
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center gap-2 transition-all shadow-sm"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          {/* Admin Attendance Regularization */}
          {isAdmin && (
            <button
              onClick={() => setRegularizeOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
            >
              <Edit3 size={14} />
              <span>Regularize Attendance</span>
            </button>
          )}
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Date</th>
                {isAdmin && <th className="px-5 py-3.5">Employee</th>}
                <th className="px-5 py-3.5">Clock In</th>
                <th className="px-5 py-3.5">Clock Out</th>
                <th className="px-5 py-3.5">Total Hours</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Shift Notes & Audit Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="text-center py-12 text-slate-500">
                    No attendance records match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((rec) => {
                  const emp = rec.profile || employees.find((e) => e.id === rec.user_id);
                  const isRegularized = Boolean(rec.correction_reason);

                  return (
                    <tr key={rec.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-4 font-mono font-medium text-white whitespace-nowrap">
                        {formatDate(rec.date)}
                      </td>

                      {isAdmin && (
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={emp?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${emp?.name || 'User'}`}
                              alt={emp?.name || 'Employee'}
                              className="w-7 h-7 rounded-lg object-cover border border-slate-700"
                            />
                            <div>
                              <div className="font-bold text-white leading-tight">{emp?.name || 'Unknown'}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {emp?.employee_id || rec.user_id.slice(-6)} • {emp?.department}
                              </div>
                            </div>
                          </div>
                        </td>
                      )}

                      <td className="px-5 py-4 font-mono whitespace-nowrap">
                        <span className={rec.is_late ? 'text-amber-400 font-bold' : 'text-slate-200'}>
                          {rec.clock_in || '--:--:--'}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-mono whitespace-nowrap">
                        <span className={rec.is_early_departure ? 'text-amber-400' : 'text-slate-200'}>
                          {rec.clock_out || (rec.clock_in ? 'In Progress' : '--:--:--')}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-mono font-semibold text-emerald-400 whitespace-nowrap">
                        {rec.total_hours ? `${rec.total_hours} hrs` : '--'}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          {getStatusBadge(rec.status, rec.is_late, rec.is_early_departure)}
                          {isRegularized && (
                            <span className="text-[9px] font-semibold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">
                              Admin Adjusted
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="max-w-md space-y-1">
                          {rec.notes && <p className="text-slate-300 italic">{rec.notes}</p>}
                          {rec.correction_reason && (
                            <div className="text-[11px] text-indigo-300 bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-800/40">
                              <span className="font-semibold text-indigo-400">Regularization Reason: </span>
                              {rec.correction_reason}
                              {rec.corrected_at && (
                                <span className="text-slate-400 text-[10px] block mt-0.5">
                                  Audited on {formatDate(rec.corrected_at)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REGULARIZE ATTENDANCE MODAL */}
      {regularizeOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Authorized Attendance Regularization</h3>
                <p className="text-xs text-slate-400">Correct punch times, resolve missing checkouts, and log audit trail.</p>
              </div>
              <button onClick={() => setRegularizeOpen(false)} className="text-slate-400 hover:text-white text-xl">
                &times;
              </button>
            </div>

            <form onSubmit={handleRegularizeSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Employee *</label>
                <select
                  value={regUserId}
                  onChange={(e) => setRegUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.employee_id || e.title})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Date *</label>
                <input
                  type="date"
                  value={regDate}
                  onChange={(e) => setRegDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Clock In Time</label>
                  <input
                    type="time"
                    step="1"
                    value={regClockIn}
                    onChange={(e) => setRegClockIn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Clock Out Time</label>
                  <input
                    type="time"
                    step="1"
                    value={regClockOut}
                    onChange={(e) => setRegClockOut(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Status Override</label>
                <select
                  value={regStatus}
                  onChange={(e) => setRegStatus(e.target.value as AttendanceStatus)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="present">Present (Full Day)</option>
                  <option value="half_day">Half Day</option>
                  <option value="late">Late Arrival</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Correction Reason (Mandatory Audit) *</label>
                <textarea
                  value={regReason}
                  onChange={(e) => setRegReason(e.target.value)}
                  required
                  rows={3}
                  placeholder="e.g. Employee punch biometric missed due to client deployment offsite."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRegularizeOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
                >
                  Confirm & Audit Regularization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
