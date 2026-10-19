import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { crmService } from '@/services/crmService';
import {
  FollowUp,
  FollowUpStatus,
  FollowUpType,
  LeadPriority,
  Lead
} from '@/types/database';
import { formatDate } from '@/lib/utils';
import {
  CalendarClock,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RotateCw,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  Video,
  CheckSquare,
  AlertTriangle,
  Building,
  User,
  Calendar,
  Sparkles,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

export const FollowupsPage: React.FC = () => {
  const { user, isAdmin, showToast } = useAuth();

  // State
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyTimezone, setCompanyTimezone] = useState('America/New_York');

  // Stale and No-Response leads
  const [staleLeads, setStaleLeads] = useState<Lead[]>([]);
  const [noResponseLeads, setNoResponseLeads] = useState<Lead[]>([]);
  const [uncontactedThreshold, setUncontactedThreshold] = useState(7);
  const [noResponseThreshold, setNoResponseThreshold] = useState(5);

  // Tabs & Filters
  const [statusTab, setStatusTab] = useState<FollowUpStatus>('due_today');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Form State for Create
  const [targetLeadId, setTargetLeadId] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<FollowUpType>('call');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('11:00');
  const [priority, setPriority] = useState<LeadPriority>('medium');
  const [notes, setNotes] = useState('');

  // Reschedule Modal
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [activeFollowUpForReschedule, setActiveFollowUpForReschedule] = useState<FollowUp | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Complete Modal
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [activeFollowUpForComplete, setActiveFollowUpForComplete] = useState<FollowUp | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');

  // Cancel Modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [activeFollowUpForCancel, setActiveFollowUpForCancel] = useState<FollowUp | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [fetchedFollowups, fetchedLeads, staleData] = await Promise.all([
        crmService.getFollowUps(user?.id, { status: 'all' }),
        crmService.getLeads(user?.id),
        crmService.getStaleAndNoResponseLeads(user?.id)
      ]);

      setFollowUps(fetchedFollowups);
      setLeads(fetchedLeads);
      setStaleLeads(staleData.staleLeads);
      setNoResponseLeads(staleData.noResponseLeads);
      setCompanyTimezone(staleData.timezone);
      setUncontactedThreshold(staleData.uncontactedThresholdDays);
      setNoResponseThreshold(staleData.noResponseThresholdDays);

      if (!dueDate) {
        // Form default due date in company timezone
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: staleData.timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        setDueDate(formatter.format(now));
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load follow-up activities.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Handle Create Follow-up
  const handleCreateFollowUp = async (e: React.FormEvent, forceDuplicate = false) => {
    e.preventDefault();
    if (!targetLeadId) {
      showToast('Please choose a target lead.', 'error');
      return;
    }
    if (!title || !dueDate) {
      showToast('Title and Due Date are required.', 'error');
      return;
    }

    try {
      await crmService.createFollowUp(
        {
          lead_id: targetLeadId,
          title,
          type,
          due_date: dueDate,
          due_time: dueTime || null,
          priority,
          notes: notes || null
        },
        user?.id,
        forceDuplicate
      );

      showToast('Follow-up scheduled successfully.', 'success');
      setCreateModalOpen(false);
      setDuplicateWarning(null);
      resetCreateForm();
      loadData();
    } catch (err: any) {
      if (err.message && (err.message.includes('Duplicate Follow-up') || err.message.includes('Duplicate follow-up'))) {
        setDuplicateWarning(err.message);
      } else {
        showToast(err.message || 'Failed to schedule follow-up.', 'error');
      }
    }
  };

  const resetCreateForm = () => {
    setTargetLeadId('');
    setTitle('');
    setType('call');
    setPriority('medium');
    setNotes('');
    setDuplicateWarning(null);
  };

  // Handle Reschedule
  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFollowUpForReschedule) return;
    if (!rescheduleDate) {
      showToast('Please specify a new date.', 'error');
      return;
    }

    try {
      await crmService.rescheduleFollowUp(
        activeFollowUpForReschedule.id,
        rescheduleDate,
        rescheduleTime || null,
        rescheduleReason || 'Rescheduled via calendar update',
        user?.id
      );

      showToast('Follow-up rescheduled.', 'success');
      setRescheduleModalOpen(false);
      setActiveFollowUpForReschedule(null);
      setRescheduleReason('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Reschedule failed.', 'error');
    }
  };

  // Handle Complete
  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFollowUpForComplete) return;

    try {
      await crmService.completeFollowUp(
        activeFollowUpForComplete.id,
        completionNotes || 'Follow-up completed.',
        user?.id
      );

      showToast('Follow-up marked as completed.', 'success');
      setCompleteModalOpen(false);
      setActiveFollowUpForComplete(null);
      setCompletionNotes('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to complete follow-up.', 'error');
    }
  };

  // Handle Cancel
  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFollowUpForCancel) return;

    try {
      await crmService.cancelFollowUp(
        activeFollowUpForCancel.id,
        cancellationReason || 'Cancelled by sales representative',
        user?.id
      );

      showToast('Follow-up marked as cancelled.', 'info');
      setCancelModalOpen(false);
      setActiveFollowUpForCancel(null);
      setCancellationReason('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel follow-up.', 'error');
    }
  };

  // Counts by Status
  const counts: Record<FollowUpStatus, number> = {
    due_today: followUps.filter((f) => f.status === 'due_today').length,
    overdue: followUps.filter((f) => f.status === 'overdue').length,
    upcoming: followUps.filter((f) => f.status === 'upcoming').length,
    completed: followUps.filter((f) => f.status === 'completed').length,
    cancelled: followUps.filter((f) => f.status === 'cancelled').length
  };

  // Filtered List
  const filteredFollowUps = followUps.filter((item) => {
    if (item.status !== statusTab) return false;
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const company = item.lead?.company_name || item.lead?.company || '';
      const matchCompany = company.toLowerCase().includes(q);
      const matchContact = item.lead?.contact_name?.toLowerCase().includes(q);
      const matchNotes = item.notes?.toLowerCase().includes(q);
      if (!matchTitle && !matchCompany && !matchContact && !matchNotes) return false;
    }
    return true;
  });

  const getTypeIcon = (t: FollowUpType) => {
    switch (t) {
      case 'call':
        return <Phone className="h-4 w-4 text-emerald-400" />;
      case 'email':
        return <Mail className="h-4 w-4 text-indigo-400" />;
      case 'meeting':
        return <Video className="h-4 w-4 text-purple-400" />;
      case 'task':
        return <CheckSquare className="h-4 w-4 text-amber-400" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  const getPriorityBadge = (p: LeadPriority) => {
    switch (p) {
      case 'high':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'low':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 shadow-sm backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <CalendarClock className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">Scheduled Follow-ups</h1>
          </div>
          <p className="text-sm text-slate-400">
            Manage time-sensitive prospect touchpoints, upcoming calls, demos, and prioritized reminders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs">
            <Clock className="h-3.5 w-3.5 text-indigo-400" />
            <span>Timezone:</span>
            <strong className="text-indigo-300">{companyTimezone}</strong>
          </div>

          <button
            onClick={() => {
              resetCreateForm();
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Schedule Follow-up</span>
          </button>
        </div>
      </div>

      {/* Stale and No-Response Warning Banners */}
      {(staleLeads.length > 0 || noResponseLeads.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {noResponseLeads.length > 0 && (
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 text-xs text-slate-300">
              <div className="flex items-center gap-2 font-bold text-amber-300 mb-1">
                <AlertCircle className="h-4 w-4" />
                <span>Leads Awaiting Response ({noResponseLeads.length})</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  &gt;{noResponseThreshold} Days Idle
                </span>
              </div>
              <p className="text-slate-400 text-[11px] mb-2">
                Outreach was sent but prospect has not replied. Consider sending a value-add follow-up nudge:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {noResponseLeads.slice(0, 4).map((l) => (
                  <span
                    key={l.id}
                    className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-amber-200"
                  >
                    {l.company_name} ({l.contact_name})
                  </span>
                ))}
                {noResponseLeads.length > 4 && (
                  <span className="text-[11px] text-slate-500 self-center">
                    +{noResponseLeads.length - 4} more
                  </span>
                )}
              </div>
            </div>
          )}

          {staleLeads.length > 0 && (
            <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-4 text-xs text-slate-300">
              <div className="flex items-center gap-2 font-bold text-rose-300 mb-1">
                <AlertTriangle className="h-4 w-4" />
                <span>Stale Uncontacted Leads ({staleLeads.length})</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  &gt;{uncontactedThreshold} Days No Activity
                </span>
              </div>
              <p className="text-slate-400 text-[11px] mb-2">
                These active pipeline prospects have had zero logged touchpoints in over a week:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {staleLeads.slice(0, 4).map((l) => (
                  <span
                    key={l.id}
                    className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-rose-200"
                  >
                    {l.company_name}
                  </span>
                ))}
                {staleLeads.length > 4 && (
                  <span className="text-[11px] text-slate-500 self-center">
                    +{staleLeads.length - 4} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setStatusTab('due_today')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            statusTab === 'due_today'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-md shadow-amber-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Due Today</span>
          <span className="px-1.5 py-0.2 rounded-md bg-amber-500/30 text-amber-200 text-[10px]">
            {counts.due_today}
          </span>
        </button>

        <button
          onClick={() => setStatusTab('overdue')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            statusTab === 'overdue'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-md shadow-rose-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <AlertCircle className="h-3.5 w-3.5" />
          <span>Overdue</span>
          <span className="px-1.5 py-0.2 rounded-md bg-rose-500/30 text-rose-200 text-[10px]">
            {counts.overdue}
          </span>
        </button>

        <button
          onClick={() => setStatusTab('upcoming')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            statusTab === 'upcoming'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-md shadow-blue-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>Upcoming</span>
          <span className="px-1.5 py-0.2 rounded-md bg-blue-500/30 text-blue-200 text-[10px]">
            {counts.upcoming}
          </span>
        </button>

        <button
          onClick={() => setStatusTab('completed')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            statusTab === 'completed'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-md shadow-emerald-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Completed</span>
          <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/30 text-emerald-200 text-[10px]">
            {counts.completed}
          </span>
        </button>

        <button
          onClick={() => setStatusTab('cancelled')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            statusTab === 'cancelled'
              ? 'bg-slate-800 text-slate-300 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <XCircle className="h-3.5 w-3.5" />
          <span>Cancelled</span>
          <span className="px-1.5 py-0.2 rounded-md bg-slate-700 text-slate-300 text-[10px]">
            {counts.cancelled}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/40 p-3 rounded-2xl border border-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by title, lead, contact, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Follow-up Types</option>
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="meeting">Meeting / Demo</option>
            <option value="task">Internal Task</option>
          </select>
        </div>
      </div>

      {/* Follow-up Cards Feed */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 text-xs">Loading follow-up tasks...</div>
      ) : filteredFollowUps.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">
          <CalendarClock className="h-10 w-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">No follow-ups in &quot;{statusTab.replace('_', ' ')}&quot;</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Stay on top of deal velocity and client commitments by scheduling your next interaction.
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            Schedule a Follow-up
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFollowUps.map((item) => {
            const leadCompany = item.lead?.company_name || 'Associated Lead';
            const leadContact = item.lead?.contact_name;

            return (
              <div
                key={item.id}
                className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 hover:border-slate-700 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <span className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
                    {getTypeIcon(item.type)}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{item.title}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium border border-slate-700">
                        {leadCompany}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${getPriorityBadge(
                          item.priority
                        )}`}
                      >
                        {item.priority.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                      {leadContact && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 text-slate-500" />
                          {leadContact}
                        </span>
                      )}
                      <span className="flex items-center gap-1 font-semibold text-slate-300">
                        <Calendar className="h-3 w-3 text-indigo-400" />
                        Due: {formatDate(item.due_date)} {item.due_time ? `@ ${item.due_time}` : ''}
                      </span>
                      {item.rescheduled_reason && (
                        <span className="text-[11px] text-amber-400 italic">
                          (Rescheduled: {item.rescheduled_reason})
                        </span>
                      )}
                    </div>

                    {item.notes && (
                      <p className="text-xs text-slate-300 mt-2 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                        {item.notes}
                      </p>
                    )}

                    {item.completion_notes && (
                      <p className="text-xs text-emerald-300 mt-2 bg-emerald-950/20 p-2 rounded-xl border border-emerald-500/20">
                        <strong>Outcome:</strong> {item.completion_notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
                  {item.status !== 'completed' && item.status !== 'cancelled' && (
                    <>
                      <button
                        onClick={() => {
                          setActiveFollowUpForComplete(item);
                          setCompleteModalOpen(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Complete</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveFollowUpForReschedule(item);
                          setRescheduleDate(item.due_date);
                          setRescheduleTime(item.due_time || '11:00');
                          setRescheduleModalOpen(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                        <span>Reschedule</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveFollowUpForCancel(item);
                          setCancelModalOpen(true);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 text-xs font-medium transition-all"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Cancel</span>
                      </button>
                    </>
                  )}

                  {item.status === 'completed' && (
                    <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Completed
                    </span>
                  )}

                  {item.status === 'cancelled' && (
                    <span className="px-3 py-1 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 text-xs font-medium">
                      Cancelled
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Follow-up Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <CalendarClock className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-white">Schedule Follow-up Action</h2>
                  <p className="text-xs text-slate-400">Company Timezone: {companyTimezone}</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {duplicateWarning && (
              <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs text-amber-200 space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span>Duplicate Follow-up Warning</span>
                </div>
                <p>{duplicateWarning}</p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={(e) => handleCreateFollowUp(e, true)}
                    className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs"
                  >
                    Proceed Anyway (Create Duplicate)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuplicateWarning(null)}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                  >
                    Modify Date/Type
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={(e) => handleCreateFollowUp(e, false)} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Target Lead <span className="text-rose-400">*</span>
                </label>
                <select
                  value={targetLeadId}
                  onChange={(e) => setTargetLeadId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                >
                  <option value="">Select a Lead...</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.company_name} — {l.contact_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Follow-up Action Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Schedule commercial pricing review call"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Interaction Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as FollowUpType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting / Demo</option>
                    <option value="task">Internal Task</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as LeadPriority)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Due Date ({companyTimezone}) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => {
                      setDueDate(e.target.value);
                      setDuplicateWarning(null);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Due Time (Optional)</label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notes / Action Details</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Specific talking points or deal context..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all"
                >
                  Schedule Follow-up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModalOpen && activeFollowUpForReschedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <RotateCw className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-white">Reschedule Follow-up</h2>
                  <p className="text-xs text-slate-400">{activeFollowUpForReschedule.title}</p>
                </div>
              </div>
              <button
                onClick={() => setRescheduleModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReschedule} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    New Date ({companyTimezone}) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">New Time</label>
                  <input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Reason for Rescheduling</label>
                <input
                  type="text"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Prospect asked to push to next Monday afternoon"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRescheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30 transition-all"
                >
                  Update Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {completeModalOpen && activeFollowUpForComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-white">Complete Follow-up</h2>
                  <p className="text-xs text-slate-400">{activeFollowUpForComplete.title}</p>
                </div>
              </div>
              <button
                onClick={() => setCompleteModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleComplete} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Completion Notes / Interaction Summary
                </label>
                <textarea
                  rows={3}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="e.g. Call finished; client agreed to proceed with proposal presentation next week."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCompleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all"
                >
                  Mark Completed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModalOpen && activeFollowUpForCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-slate-800 text-slate-400">
                  <XCircle className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-white">Cancel Follow-up</h2>
                  <p className="text-xs text-slate-400">{activeFollowUpForCancel.title}</p>
                </div>
              </div>
              <button
                onClick={() => setCancelModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCancel} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Cancellation Reason</label>
                <input
                  type="text"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="e.g. Lead signed contract ahead of time; demo no longer necessary."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all"
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FollowupsPage;
