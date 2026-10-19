import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { crmService } from '../services/crmService';
import { AttendanceRecord, AttendanceStatus, UserProfile } from '../types/database';
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
  Search
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const AttendancePage: React.FC = () => {
  const { user, isAdmin, showToast } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
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
  const [regClockOut, setRegClockOut] = useState('17:30:00');
  const [regStatus, setRegStatus] = useState<AttendanceStatus>('present');
  const [regNotes, setRegNotes] = useState('Founder regularization');

  const loadData = async () => {
    try {
      setLoading(true);
      const [todayData, emps] = await Promise.all([
        crmService.getTodayAttendance(user?.id || ''),
        crmService.getEmployees()
      ]);
      setTodayRecord(todayData.myRecord);
      setEmployees(emps);
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
      showToast(`Clocked in at ${rec.clock_in}!`, 'success');
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
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
      showToast(`Clocked out at ${rec.clock_out}. Total hours: ${rec.total_hours}h`, 'info');
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
    try {
      await crmService.regularizeAttendance({
        user_id: regUserId,
        date: regDate,
        clock_in: regClockIn,
        clock_out: regClockOut,
        status: regStatus,
        notes: regNotes
      });
      showToast('Attendance record regularized successfully', 'success');
      setRegularizeOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to regularize', 'error');
    }
  };

  const exportCSV = () => {
    const headers = ['Date', 'Employee', 'Clock In', 'Clock Out', 'Total Hours', 'Status', 'Notes'];
    const rows = filteredAttendance.map((a) => [
      a.date,
      a.profile?.name || user?.name || 'Staff',
      a.clock_in || '—',
      a.clock_out || '—',
      a.total_hours || 0,
      a.status,
      a.notes || ''
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isClockedIn = Boolean(todayRecord && todayRecord.clock_in && !todayRecord.clock_out);
  const isClockedOut = Boolean(todayRecord && todayRecord.clock_out);

  // Filter attendance
  const filteredAttendance = attendance.filter((a) => {
    if (selectedUser !== 'all' && a.user_id !== selectedUser) return false;
    if (selectedStatus !== 'all' && a.status !== selectedStatus) return false;
    if (dateFilter && a.date !== dateFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Regularize Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {isAdmin ? 'Company Attendance Management' : 'My Daily Attendance & Timesheet'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAdmin
              ? 'Review employee clock-in hours, punctuality tracking, and manual timesheet regularizations.'
              : 'Log your work shift hours, track monthly attendance records, and review punctuality.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setRegularizeOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
            >
              <Plus size={16} />
              <span>Regularize Attendance</span>
            </button>
          )}

          <button
            onClick={exportCSV}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Daily Clock-In Punch Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
            Daily Shift Status
          </span>
          <h3 className="text-xl font-bold text-white mt-1">
            {isClockedIn ? (
              <span className="text-emerald-400 flex items-center gap-2">
                <CheckCircle2 size={20} />
                <span>Actively Clocked In &bull; Shift in Progress</span>
              </span>
            ) : isClockedOut ? (
              <span className="text-cyan-400 flex items-center gap-2">
                <CheckCircle2 size={20} />
                <span>Shift Completed ({todayRecord?.total_hours} hrs logged)</span>
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-2">
                <AlertCircle size={20} />
                <span>You have not clocked in for today yet</span>
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {todayRecord?.clock_in
              ? `Shift started at ${todayRecord.clock_in} ${todayRecord.status === 'late' ? '(Late Arrival recorded)' : '(On Time)'}`
              : 'Core working hours: 09:30 AM to 06:00 PM.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {!isClockedIn && !isClockedOut && (
            <input
              type="text"
              placeholder="Optional shift notes (e.g. Remote)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 w-full sm:w-64 focus:outline-none focus:border-indigo-500"
            />
          )}

          {!isClockedIn && !isClockedOut && (
            <button
              onClick={handleClockIn}
              disabled={clockLoading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <Clock size={16} />
              <span>Punch In Now</span>
            </button>
          )}

          {isClockedIn && (
            <button
              onClick={handleClockOut}
              disabled={clockLoading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <Clock size={16} />
              <span>Punch Out & Finish Shift</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar (Admin) */}
      {isAdmin && (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Employee:</span>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.department})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="present">Present (On Time)</option>
                <option value="late">Late Arrival</option>
                <option value="half_day">Half Day</option>
                <option value="absent">Absent</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Date:</span>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter('')}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-4">Date</th>
                {isAdmin && <th className="p-4">Employee</th>}
                <th className="p-4">Clock In</th>
                <th className="p-4">Clock Out</th>
                <th className="p-4">Total Duration</th>
                <th className="p-4">Status</th>
                <th className="p-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAttendance.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 font-semibold text-white">{formatDate(rec.date)}</td>
                  {isAdmin && (
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {rec.profile?.avatar_url && (
                          <img
                            src={rec.profile.avatar_url}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        )}
                        <div>
                          <div className="font-bold text-white">{rec.profile?.name || 'Staff Member'}</div>
                          <div className="text-[10px] text-slate-400">{rec.profile?.department}</div>
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="p-4 font-mono text-slate-200">{rec.clock_in || '—'}</td>
                  <td className="p-4 font-mono text-slate-200">{rec.clock_out || '—'}</td>
                  <td className="p-4 font-extrabold text-cyan-400">
                    {rec.total_hours ? `${rec.total_hours} hrs` : '—'}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        rec.status === 'present'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : rec.status === 'late'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : rec.status === 'half_day'
                          ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                          : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {rec.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400 max-w-xs truncate">{rec.notes || '—'}</td>
                </tr>
              ))}
              {filteredAttendance.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="p-8 text-center text-slate-500">
                    No attendance records found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADMIN REGULARIZE MODAL */}
      {regularizeOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Regularize Employee Attendance</h3>
              <button
                onClick={() => setRegularizeOpen(false)}
                className="text-slate-400 hover:text-white text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleRegularizeSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Employee *</label>
                <select
                  value={regUserId}
                  onChange={(e) => setRegUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.title})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={regDate}
                  onChange={(e) => setRegDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Clock In (HH:MM:SS)</label>
                  <input
                    type="text"
                    value={regClockIn}
                    onChange={(e) => setRegClockIn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Clock Out (HH:MM:SS)</label>
                  <input
                    type="text"
                    value={regClockOut}
                    onChange={(e) => setRegClockOut(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Status</label>
                <select
                  value={regStatus}
                  onChange={(e) => setRegStatus(e.target.value as AttendanceStatus)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  <option value="present">Present</option>
                  <option value="late">Late Arrival</option>
                  <option value="half_day">Half Day</option>
                  <option value="absent">Absent</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Founder Reason / Note</label>
                <input
                  type="text"
                  value={regNotes}
                  onChange={(e) => setRegNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRegularizeOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
                >
                  Save Regularization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
