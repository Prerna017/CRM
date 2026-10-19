import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { crmService } from '../services/crmService';
import { LeaveRecord, LeaveType } from '../types/database';
import { formatDate } from '../lib/utils';
import {
  CalendarCheck,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const LeavesPage: React.FC = () => {
  const { user, isAdmin, showToast } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Apply Modal State
  const [applyOpen, setApplyOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [daysCount, setDaysCount] = useState<number>(1);
  const [reason, setReason] = useState('');

  // Review Modal State (Admin)
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRecord | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [adminRemarks, setAdminRemarks] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      if (isAdmin) {
        const allLeaves = await crmService.getAllLeaves();
        setLeaves(allLeaves);
      } else {
        const myLeaves = await crmService.getMyLeaves(user?.id || '');
        setLeaves(myLeaves);
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

  // Compute remaining balances for current user
  const usedAnnual = leaves
    .filter((l) => l.user_id === user?.id && l.status === 'approved' && l.leave_type === 'annual')
    .reduce((sum, l) => sum + (l.days_count || 0), 0);
  const usedSick = leaves
    .filter((l) => l.user_id === user?.id && l.status === 'approved' && l.leave_type === 'sick')
    .reduce((sum, l) => sum + (l.days_count || 0), 0);
  const usedCasual = leaves
    .filter((l) => l.user_id === user?.id && l.status === 'approved' && l.leave_type === 'casual')
    .reduce((sum, l) => sum + (l.days_count || 0), 0);

  const remainingAnnual = Math.max(0, (user?.annual_leave_quota || 18) - usedAnnual);
  const remainingSick = Math.max(0, (user?.sick_leave_quota || 10) - usedSick);
  const remainingCasual = Math.max(0, (user?.casual_leave_quota || 8) - usedCasual);

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) {
      showToast('All fields are required', 'error');
      return;
    }

    try {
      await crmService.applyLeave({
        user_id: user?.id || 'user-001',
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        days_count: Number(daysCount) || 1,
        reason: reason.trim()
      });

      showToast('Leave application submitted for Founder approval!', 'success');
      setApplyOpen(false);
      setReason('');
      setStartDate('');
      setEndDate('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit leave', 'error');
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeave) return;

    try {
      await crmService.reviewLeave(selectedLeave.id, reviewStatus, adminRemarks, user?.id || 'admin-001');
      if (reviewStatus === 'approved') {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        showToast(`Leave request approved for ${selectedLeave.profile?.name || 'employee'}!`, 'success');
      } else {
        showToast('Leave request rejected.', 'info');
      }
      setReviewOpen(false);
      setSelectedLeave(null);
      setAdminRemarks('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to review leave', 'error');
    }
  };

  const pendingLeaves = leaves.filter((l) => l.status === 'pending');

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {isAdmin ? 'Employee Leave Approvals' : 'My Leave Applications & Quotas'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAdmin
              ? 'Review pending time-off requests, balances, and approve or reject with founder remarks.'
              : 'Submit vacation or sick leave applications and check your annual quota balance.'}
          </p>
        </div>

        <button
          onClick={() => setApplyOpen(true)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all w-fit"
        >
          <Plus size={16} />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* Leave Quota Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Annual / Paid Leave</span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Vacation
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-white">{remainingAnnual} Days Left</h3>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full"
                style={{ width: `${(remainingAnnual / (user?.annual_leave_quota || 18)) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Used {usedAnnual} of {user?.annual_leave_quota || 18} allocated days
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Sick / Medical Leave</span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              Health
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-white">{remainingSick} Days Left</h3>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-cyan-500 h-full rounded-full"
                style={{ width: `${(remainingSick / (user?.sick_leave_quota || 10)) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Used {usedSick} of {user?.sick_leave_quota || 10} allocated days
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Casual / Emergency</span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Personal
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-white">{remainingCasual} Days Left</h3>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full"
                style={{ width: `${(remainingCasual / (user?.casual_leave_quota || 8)) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Used {usedCasual} of {user?.casual_leave_quota || 8} allocated days
            </p>
          </div>
        </div>
      </div>

      {/* Admin Pending Requests Approval Queue */}
      {isAdmin && pendingLeaves.length > 0 && (
        <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                Pending Leave Approvals ({pendingLeaves.length})
              </h3>
            </div>
            <span className="text-xs text-amber-300 font-semibold">Requires Founder Decision</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingLeaves.map((l) => (
              <div key={l.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{l.profile?.name}</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      {l.leave_type} &bull; {l.days_count} Day(s)
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {formatDate(l.start_date)} to {formatDate(l.end_date)}
                  </p>
                  <p className="text-xs text-slate-300 mt-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                    "{l.reason}"
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setSelectedLeave(l);
                      setReviewStatus('rejected');
                      setReviewOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 text-xs font-semibold"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      setSelectedLeave(l);
                      setReviewStatus('approved');
                      setReviewOpen(true);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leave History Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-950/60">
          <h3 className="text-sm font-bold text-white">Leave History & Records</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                {isAdmin && <th className="p-4">Applicant</th>}
                <th className="p-4">Leave Type</th>
                <th className="p-4">Dates</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Reason</th>
                <th className="p-4">Status</th>
                <th className="p-4">Admin Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {leaves.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                  {isAdmin && (
                    <td className="p-4 font-bold text-white">
                      {l.profile?.name || 'Staff Member'}
                    </td>
                  )}
                  <td className="p-4">
                    <span className="capitalize font-semibold text-slate-200">{l.leave_type}</span>
                  </td>
                  <td className="p-4 text-slate-300">
                    {formatDate(l.start_date)} &rarr; {formatDate(l.end_date)}
                  </td>
                  <td className="p-4 font-bold text-white">{l.days_count} Day(s)</td>
                  <td className="p-4 text-slate-300 max-w-xs truncate">{l.reason}</td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        l.status === 'approved'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : l.status === 'pending'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400 italic">
                    {l.admin_remarks || '—'}
                  </td>
                </tr>
              ))}
              {leaves.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="p-8 text-center text-slate-500">
                    No leave requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* APPLY LEAVE MODAL */}
      {applyOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Apply for Leave</h3>
              <button onClick={() => setApplyOpen(false)} className="text-slate-400 hover:text-white text-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Leave Category *</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  <option value="annual">Annual / Paid Vacation ({remainingAnnual} days remaining)</option>
                  <option value="sick">Medical / Sick Leave ({remainingSick} days remaining)</option>
                  <option value="casual">Casual / Emergency ({remainingCasual} days remaining)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Total Days *</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  required
                  value={daysCount}
                  onChange={(e) => setDaysCount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Reason for Absence *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe reason for leave request..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setApplyOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN REVIEW MODAL */}
      {reviewOpen && selectedLeave && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">
                {reviewStatus === 'approved' ? 'Approve Leave Request' : 'Reject Leave Request'}
              </h3>
              <button onClick={() => setReviewOpen(false)} className="text-slate-400 hover:text-white text-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="mt-4 space-y-4">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <p>
                  <strong>Applicant:</strong> {selectedLeave.profile?.name}
                </p>
                <p>
                  <strong>Type:</strong> {selectedLeave.leave_type} ({selectedLeave.days_count} days)
                </p>
                <p>
                  <strong>Reason:</strong> "{selectedLeave.reason}"
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Founder Remarks / Feedback</label>
                <textarea
                  rows={3}
                  placeholder={
                    reviewStatus === 'approved'
                      ? 'Approved. Have a great vacation!'
                      : 'Unfortunately we have key deliverables this week.'
                  }
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReviewOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-lg ${
                    reviewStatus === 'approved'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                  }`}
                >
                  Confirm {reviewStatus === 'approved' ? 'Approval' : 'Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
