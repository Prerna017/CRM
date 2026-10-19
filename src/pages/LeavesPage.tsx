import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { crmService } from '../services/crmService';
import { LeaveRecord, LeaveType, LeaveDurationType, HalfDayPeriod } from '../types/database';
import { formatDate } from '../lib/utils';
import {
  CalendarCheck,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Paperclip,
  ShieldCheck,
  Ban,
  UserCheck,
  Calendar,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const LeavesPage: React.FC = () => {
  const { user, isAdmin, showToast } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Apply Modal State
  const [applyOpen, setApplyOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>('annual');
  const [durationType, setDurationType] = useState<LeaveDurationType>('full_day');
  const [halfDayPeriod, setHalfDayPeriod] = useState<HalfDayPeriod>('first_half');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');

  // Review Modal State (Admin)
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRecord | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [adminRemarks, setAdminRemarks] = useState('');

  // Filter state
  const [statusFilter, setStatusFilter] = useState('all');

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

  const remainingAnnual = Math.max(0, +( (user?.annual_leave_quota || 18) - usedAnnual ).toFixed(1));
  const remainingSick = Math.max(0, +( (user?.sick_leave_quota || 10) - usedSick ).toFixed(1));
  const remainingCasual = Math.max(0, +( (user?.casual_leave_quota || 8) - usedCasual ).toFixed(1));

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveEndDate = durationType === 'half_day' ? startDate : endDate;

    if (!startDate || (!effectiveEndDate && durationType === 'full_day') || !reason.trim()) {
      showToast('Dates and Reason are required', 'error');
      return;
    }

    try {
      await crmService.applyLeave({
        user_id: user?.id || 'user-001',
        leave_type: leaveType,
        duration_type: durationType,
        half_day_period: durationType === 'half_day' ? halfDayPeriod : null,
        start_date: startDate,
        end_date: effectiveEndDate,
        days_count: durationType === 'half_day' ? 0.5 : undefined as any,
        reason: reason.trim(),
        attachment_url: attachmentUrl.trim() || null
      });

      showToast('Leave application submitted for approval!', 'success');
      setApplyOpen(false);
      setReason('');
      setStartDate('');
      setEndDate('');
      setAttachmentUrl('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit leave', 'error');
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeave || !user) return;

    if (selectedLeave.user_id === user.id) {
      showToast('Security Violation: You cannot approve or reject your own leave requests.', 'error');
      return;
    }

    try {
      await crmService.reviewLeave(selectedLeave.id, reviewStatus, adminRemarks, user.id);
      showToast(
        reviewStatus === 'approved'
          ? 'Leave request approved and deducted from employee quota.'
          : 'Leave request marked as rejected.',
        reviewStatus === 'approved' ? 'success' : 'info'
      );
      if (reviewStatus === 'approved') {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      }
      setReviewOpen(false);
      setSelectedLeave(null);
      setAdminRemarks('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Review failed', 'error');
    }
  };

  const handleCancelLeave = async (leave: LeaveRecord) => {
    if (!window.confirm('Are you sure you want to cancel this leave application?')) return;
    try {
      await crmService.cancelLeave(leave.id, user?.id || '');
      showToast('Leave request cancelled successfully', 'info');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel leave', 'error');
    }
  };

  const filteredLeaves = leaves.filter((l) => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            <CheckCircle2 size={11} />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/25">
            <XCircle size={11} />
            Rejected
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            <Ban size={11} />
            Cancelled
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
            <Clock size={11} />
            Pending Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              {isAdmin ? 'Employee Leave Approvals & Records' : 'Leave Applications & Quota'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Safe Quota Ledger
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin
              ? 'Review pending time-off requests, cross-reference calendar overlaps, and manage quota deductions.'
              : 'Submit full-day or half-day leave requests, upload medical certificates, and track balances.'}
          </p>
        </div>

        <button
          onClick={() => setApplyOpen(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all w-fit"
        >
          <Plus size={16} />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* Quota Balances Card (Personal balances) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Annual / Vacation</span>
            <div className="text-2xl font-extrabold text-white mt-1">
              {remainingAnnual}{' '}
              <span className="text-xs font-normal text-slate-400">/ {user?.annual_leave_quota || 18} days</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-medium">Available for booking</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
            🏝️
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Sick & Medical</span>
            <div className="text-2xl font-extrabold text-white mt-1">
              {remainingSick}{' '}
              <span className="text-xs font-normal text-slate-400">/ {user?.sick_leave_quota || 10} days</span>
            </div>
            <span className="text-[10px] text-amber-400 font-medium">Certification may apply</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
            🩺
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Casual & Emergency</span>
            <div className="text-2xl font-extrabold text-white mt-1">
              {remainingCasual}{' '}
              <span className="text-xs font-normal text-slate-400">/ {user?.casual_leave_quota || 8} days</span>
            </div>
            <span className="text-[10px] text-purple-400 font-medium">Single-day / half-day flex</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
            ⚡
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">Filter Status:</span>
          {['all', 'pending', 'approved', 'rejected', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Showing {filteredLeaves.length} record(s)
        </span>
      </div>

      {/* Leaves Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredLeaves.map((leave) => {
          const isMyRequest = leave.user_id === user?.id;
          const isPending = leave.status === 'pending';
          const canReview = isAdmin && !isMyRequest;

          return (
            <div
              key={leave.id}
              className={`p-5 rounded-2xl bg-slate-900/70 border transition-all shadow-md flex flex-col justify-between hover:border-slate-700 ${
                isMyRequest ? 'border-indigo-500/30' : 'border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                      {leave.leave_type.toUpperCase()} LEAVE • {leave.duration_type === 'half_day' ? 'HALF DAY' : 'FULL DAY'}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1">
                      {leave.profile?.name || (isMyRequest ? user?.name : 'Employee')}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {leave.profile?.title || leave.profile?.department || 'Team Member'}
                    </p>
                  </div>
                  {getStatusBadge(leave.status)}
                </div>

                {/* Duration and Date breakdown */}
                <div className="mt-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Calendar size={13} className="text-indigo-400" />
                      Dates:
                    </span>
                    <span className="font-medium text-white">
                      {leave.duration_type === 'half_day'
                        ? `${formatDate(leave.start_date)} (${leave.half_day_period === 'first_half' ? 'First Half' : 'Second Half'})`
                        : `${formatDate(leave.start_date)} to ${formatDate(leave.end_date)}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Duration:</span>
                    <span className="font-bold text-indigo-300 font-mono">
                      {leave.days_count} {leave.days_count === 1 ? 'day' : 'days'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                    <span>Submitted:</span>
                    <span>{formatDate(leave.created_at)}</span>
                  </div>
                </div>

                {/* Reason */}
                <div className="mt-3 text-xs">
                  <span className="text-[11px] text-slate-400 font-medium block mb-0.5">Reason:</span>
                  <p className="text-slate-300 italic bg-slate-950/30 p-2 rounded-lg border border-slate-800/40">
                    "{leave.reason}"
                  </p>
                </div>

                {/* Attachment Link if provided */}
                {leave.attachment_url && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300">
                    <Paperclip size={13} />
                    <a href={leave.attachment_url} target="_blank" rel="noreferrer" className="underline truncate">
                      View Supporting Medical/Travel Document
                    </a>
                  </div>
                )}

                {/* Reviewer remarks if reviewed */}
                {leave.admin_remarks && (
                  <div className="mt-3 p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs">
                    <div className="font-semibold text-indigo-300 flex items-center gap-1">
                      <UserCheck size={12} />
                      Decision Note by {leave.reviewer?.name || 'Administrator'}:
                    </div>
                    <p className="text-slate-300 mt-0.5">{leave.admin_remarks}</p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                {/* Employee Cancellation */}
                {isMyRequest && isPending && (
                  <button
                    onClick={() => handleCancelLeave(leave)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                  >
                    <Ban size={13} />
                    <span>Cancel Request</span>
                  </button>
                )}

                {/* Self-Approval Prohibited Warning */}
                {isAdmin && isMyRequest && isPending && (
                  <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    <ShieldCheck size={12} />
                    Self-approval prohibited
                  </span>
                )}

                {/* Admin Review Button */}
                {canReview && isPending && (
                  <button
                    onClick={() => {
                      setSelectedLeave(leave);
                      setReviewStatus('approved');
                      setAdminRemarks('');
                      setReviewOpen(true);
                    }}
                    className="ml-auto px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
                  >
                    <CheckCircle2 size={13} />
                    <span>Review Application</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* APPLY LEAVE MODAL */}
      {applyOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Apply for Time Off</h3>
                <p className="text-xs text-slate-400">Submit leave request with date range and optional documentation.</p>
              </div>
              <button onClick={() => setApplyOpen(false)} className="text-slate-400 hover:text-white text-xl">
                &times;
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Leave Category *</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="annual">Annual / Vacation Leave</option>
                  <option value="sick">Sick / Medical Leave</option>
                  <option value="casual">Casual / Personal Emergency</option>
                  <option value="emergency">Family / Compassionate Emergency</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Duration Type *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDurationType('full_day')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all ${
                      durationType === 'full_day'
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    Full Day(s)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDurationType('half_day')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all ${
                      durationType === 'half_day'
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    Half Day (0.5 Day)
                  </button>
                </div>
              </div>

              {durationType === 'half_day' && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">Half-Day Shift Period *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="half_period"
                        checked={halfDayPeriod === 'first_half'}
                        onChange={() => setHalfDayPeriod('first_half')}
                        className="accent-indigo-600"
                      />
                      <span>First Half (Morning)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="half_period"
                        checked={halfDayPeriod === 'second_half'}
                        onChange={() => setHalfDayPeriod('second_half')}
                        className="accent-indigo-600"
                      />
                      <span>Second Half (Afternoon)</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {durationType === 'half_day' ? 'Date *' : 'Start Date *'}
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {durationType === 'full_day' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">End Date *</label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Reason for Absence *</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  rows={3}
                  placeholder="Provide context for management and team coverage scheduling..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Optional Document / Attachment URL</label>
                <input
                  type="url"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  placeholder="https://drive.google.com/medical_note.pdf"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setApplyOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
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

      {/* REVIEW LEAVE MODAL */}
      {reviewOpen && selectedLeave && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Review Leave Application</h3>
                <p className="text-xs text-slate-400">
                  Employee: <strong>{selectedLeave.profile?.name}</strong> ({selectedLeave.profile?.department})
                </p>
              </div>
              <button onClick={() => setReviewOpen(false)} className="text-slate-400 hover:text-white text-xl">
                &times;
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="mt-4 space-y-4">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <div>Dates: <strong>{formatDate(selectedLeave.start_date)} to {formatDate(selectedLeave.end_date)}</strong></div>
                <div>Days: <strong className="text-indigo-400">{selectedLeave.days_count} day(s)</strong></div>
                <div>Reason: <em className="text-slate-300">"{selectedLeave.reason}"</em></div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Decision *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewStatus('approved')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                      reviewStatus === 'approved'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <CheckCircle2 size={14} />
                    <span>Approve Leave</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewStatus('rejected')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                      reviewStatus === 'rejected'
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <XCircle size={14} />
                    <span>Reject Request</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Decision Remarks / Notes</label>
                <textarea
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  rows={3}
                  placeholder="e.g. Approved. Coverage arranged with frontend team lead."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReviewOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-lg transition-all ${
                    reviewStatus === 'approved'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                  }`}
                >
                  Confirm Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
