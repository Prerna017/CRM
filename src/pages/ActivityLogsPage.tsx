import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { crmService } from '../services/crmService';
import { AuditLogEntry, AuditTargetType, AuditAction } from '../types/database';
import { PageContainer } from '../components/layout/PageContainer';
import { formatDateTime } from '../lib/utils';
import {
  History,
  Shield,
  ShieldCheck,
  Search,
  Filter,
  FileCode,
  Download,
  Eye,
  UserCheck,
  AlertTriangle,
  Lock,
  Flame,
  Unlock,
  CheckCircle2,
  XCircle,
  FileText,
  Megaphone,
  Mail,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';

export const ActivityLogsPage: React.FC = () => {
  const { user, isAdmin, showToast } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTargetType, setSelectedTargetType] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedLogForDiff, setSelectedLogForDiff] = useState<AuditLogEntry | null>(null);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const data = await crmService.getAuditLogs(user?.id);
      setLogs(data);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
      showToast('Failed to load security audit ledger', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [user]);

  // Action badge formatting
  const getActionBadge = (action: AuditAction) => {
    switch (action) {
      case 'employee_created':
        return { label: 'Employee Provisioned', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
      case 'employee_deactivated':
        return { label: 'Employee Deactivated', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
      case 'role_changed':
        return { label: 'Role Modified', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' };
      case 'attendance_regularized':
        return { label: 'Attendance Corrected', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
      case 'leave_approved':
        return { label: 'Leave Approved', color: 'bg-teal-500/10 text-teal-400 border-teal-500/30' };
      case 'leave_rejected':
        return { label: 'Leave Rejected', color: 'bg-red-500/10 text-red-400 border-red-500/30' };
      case 'leave_cancelled':
        return { label: 'Leave Cancelled', color: 'bg-slate-500/10 text-slate-400 border-slate-500/30' };
      case 'lead_created':
        return { label: 'Lead Created', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };
      case 'lead_assigned':
        return { label: 'Lead Assigned', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' };
      case 'lead_status_changed':
        return { label: 'Lead Stage Transitioned', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' };
      case 'lead_claimed':
        return { label: 'Dead Lead Claimed', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
      case 'lead_unlocked':
        return { label: 'Lead Lock Released', color: 'bg-sky-500/10 text-sky-400 border-sky-500/30' };
      case 'admin_lock_override':
        return { label: 'Admin Lock Override', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold' };
      case 'email_logged':
        return { label: 'Email Logged', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };
      case 'reply_recorded':
        return { label: 'Reply Recorded', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
      case 'policy_published':
      case 'policy_updated':
        return { label: 'Policy Published', color: 'bg-violet-500/10 text-violet-400 border-violet-500/30' };
      case 'notice_published':
      case 'notice_scheduled':
        return { label: 'Notice Published', color: 'bg-pink-500/10 text-pink-400 border-pink-500/30' };
      default:
        return { label: action.replace(/_/g, ' ').toUpperCase(), color: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (selectedTargetType !== 'all' && log.target_type !== selectedTargetType) return false;
    if (selectedAction !== 'all' && log.action !== selectedAction) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        log.actor_name.toLowerCase().includes(q) ||
        log.actor_email.toLowerCase().includes(q) ||
        log.target_name.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExportCsv = () => {
    const headers = ['ID', 'Timestamp (UTC)', 'Actor Name', 'Actor Email', 'Actor Role', 'Action', 'Target Type', 'Target ID', 'Target Name', 'Before State', 'After State', 'Metadata'];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.created_at,
      `"${l.actor_name.replace(/"/g, '""')}"`,
      l.actor_email,
      l.actor_role,
      l.action,
      l.target_type,
      l.target_id,
      `"${l.target_name.replace(/"/g, '""')}"`,
      `"${JSON.stringify(l.before_state || {}).replace(/"/g, '""')}"`,
      `"${JSON.stringify(l.after_state || {}).replace(/"/g, '""')}"`,
      `"${JSON.stringify(l.metadata || {}).replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vingo_audit_ledger_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Audit ledger exported to CSV', 'success');
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vingo_audit_ledger_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Audit ledger exported to JSON', 'success');
  };

  return (
    <PageContainer
      title="Security Audit & Activity Ledger"
      description="Immutable, tamper-evident log of administrative operations, employee actions, timesheet regularizations, and lead assignments."
    >
      <div className="space-y-6">
        {/* Immutability & Compliance Banner */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Tamper-Evident Immutable Ledger</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  Write-Only / Unalterable
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                PostgreSQL rules block all <code className="text-rose-400">UPDATE</code> and <code className="text-rose-400">DELETE</code> operations. Audit entries are permanently preserved.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all"
            >
              <FileCode className="w-3.5 h-3.5" />
              JSON
            </button>
            <button
              onClick={loadAuditLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Sync Ledger
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search actor, target, or action..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-colors"
              />
            </div>

            <select
              value={selectedTargetType}
              onChange={(e) => setSelectedTargetType(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/60"
            >
              <option value="all">All Entity Types</option>
              <option value="employee">Employees</option>
              <option value="lead">Sales Leads</option>
              <option value="leave">Leave Requests</option>
              <option value="attendance">Attendance</option>
              <option value="email">Email Activity</option>
              <option value="policy">Company Policies</option>
              <option value="notice">Announcements</option>
            </select>

            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/60"
            >
              <option value="all">All Actions</option>
              <option value="employee_created">Employee Created</option>
              <option value="employee_deactivated">Employee Deactivated</option>
              <option value="role_changed">Role Changed</option>
              <option value="attendance_regularized">Attendance Corrected</option>
              <option value="leave_approved">Leave Approved</option>
              <option value="leave_rejected">Leave Rejected</option>
              <option value="lead_assigned">Lead Assigned</option>
              <option value="lead_claimed">Lead Claimed</option>
              <option value="lead_unlocked">Lead Unlocked</option>
              <option value="admin_lock_override">Admin Lock Override</option>
              <option value="email_logged">Email Logged</option>
              <option value="reply_recorded">Reply Recorded</option>
              <option value="policy_published">Policy Published</option>
              <option value="notice_published">Notice Published</option>
            </select>
          </div>

          <span className="text-xs text-slate-400 font-mono self-end md:self-center">
            {filteredLogs.length} audit entries recorded
          </span>
        </div>

        {/* Audit Log Table */}
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-16 text-center text-slate-500">
              <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs">Querying database audit logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-16 text-center text-slate-500">
              <History className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-40" />
              <h4 className="text-sm font-semibold text-slate-300">No audit events match your criteria</h4>
              <p className="text-xs text-slate-500 mt-1">Try broadening your search or reset filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold uppercase tracking-wider">Timestamp (UTC)</th>
                    <th className="py-3 px-4 font-semibold uppercase tracking-wider">Actor</th>
                    <th className="py-3 px-4 font-semibold uppercase tracking-wider">Action</th>
                    <th className="py-3 px-4 font-semibold uppercase tracking-wider">Target Entity</th>
                    <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">State Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredLogs.map((log) => {
                    const badge = getActionBadge(log.action);
                    return (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors group">
                        <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-[10px]">
                              {log.actor_name.charAt(0)}
                            </span>
                            <div>
                              <p className="font-semibold text-white leading-tight">{log.actor_name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-slate-500 font-mono">{log.actor_email}</span>
                                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[9px] uppercase font-semibold">
                                  {log.actor_role}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-medium ${badge.color}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div>
                            <span className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-[10px] font-mono text-indigo-300 uppercase mr-1.5">
                              {log.target_type}
                            </span>
                            <span className="text-slate-200 font-medium">{log.target_name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedLogForDiff(log)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700 hover:border-indigo-500 text-[11px] font-medium transition-all cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            Inspect Diff
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* State Diff Inspector Modal */}
      {selectedLogForDiff && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Audit State Inspection</h3>
                  <p className="text-xs text-slate-400">Log ID: {selectedLogForDiff.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLogForDiff(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Event Summary Pill */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 uppercase text-[10px] font-semibold block">Actor</span>
                <span className="text-white font-medium">{selectedLogForDiff.actor_name} ({selectedLogForDiff.actor_email})</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase text-[10px] font-semibold block">Action</span>
                <span className="text-indigo-300 font-mono font-medium">{selectedLogForDiff.action}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase text-[10px] font-semibold block">Target Entity</span>
                <span className="text-white font-medium">{selectedLogForDiff.target_name} ({selectedLogForDiff.target_type})</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase text-[10px] font-semibold block">Timestamp (UTC)</span>
                <span className="text-slate-300 font-mono">{selectedLogForDiff.created_at}</span>
              </div>
            </div>

            {/* State Diffs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-rose-400 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" />
                  Before State
                </span>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-slate-300 overflow-x-auto h-44">
                  {selectedLogForDiff.before_state
                    ? JSON.stringify(selectedLogForDiff.before_state, null, 2)
                    : '// No prior state recorded (New entity creation)'}
                </pre>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  After State
                </span>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-emerald-300 overflow-x-auto h-44">
                  {selectedLogForDiff.after_state
                    ? JSON.stringify(selectedLogForDiff.after_state, null, 2)
                    : '// Entity deleted or voided'}
                </pre>
              </div>
            </div>

            {/* Metadata Context */}
            {selectedLogForDiff.metadata && Object.keys(selectedLogForDiff.metadata).length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-400">Contextual Audit Metadata</span>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400 overflow-x-auto">
                  {JSON.stringify(selectedLogForDiff.metadata, null, 2)}
                </pre>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={() => setSelectedLogForDiff(null)}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default ActivityLogsPage;
