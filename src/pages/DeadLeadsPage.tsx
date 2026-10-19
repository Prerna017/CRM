import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { crmService } from '../services/crmService';
import { Lead, UserProfile } from '../types/database';
import { PageContainer } from '../components/layout/PageContainer';
import { formatCurrency, formatDateTime } from '../lib/utils';
import {
  Flame,
  Unlock,
  Lock,
  UserCheck,
  ShieldAlert,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Clock,
  CheckCircle2,
  Users
} from 'lucide-react';

export const DeadLeadsPage: React.FC = () => {
  const { user, isAdmin, showToast } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [reassignModalLead, setReassignModalLead] = useState<Lead | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [allLeads, allEmps] = await Promise.all([
        crmService.getLeads(user?.id),
        crmService.getEmployees(user?.id)
      ]);
      // Filter for dead leads or locked leads
      const deadOrLocked = allLeads.filter((l) => l.is_dead || l.is_locked);
      setLeads(deadOrLocked);
      setEmployees(allEmps.filter((e) => e.status === 'active'));
    } catch (err: any) {
      console.error('Failed to load dead leads:', err);
      showToast('Failed to load dead and locked leads', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleClaimLead = async (leadId: string) => {
    if (!user) return;
    try {
      await crmService.claimDeadLead(leadId, user.id);
      showToast('Dormant lead claimed! 48-hour exclusivity lock acquired.', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to claim lead', 'error');
    }
  };

  const handleUnlockLead = async (leadId: string) => {
    if (!user) return;
    try {
      await crmService.unlockDeadLead(leadId, user.id);
      showToast('Lead exclusivity lock released', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to release lock', 'error');
    }
  };

  const handleReassignLead = async () => {
    if (!user || !reassignModalLead) return;
    try {
      await crmService.assignLead(
        reassignModalLead.id,
        selectedAssignee || null,
        user.id
      );
      showToast('Lead successfully reassigned and notification delivered', 'success');
      setReassignModalLead(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to reassign lead', 'error');
    }
  };

  const filteredLeads = leads.filter((l) => {
    if (filterMode === 'unlocked' && l.is_locked) return false;
    if (filterMode === 'locked' && !l.is_locked) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        l.title.toLowerCase().includes(q) ||
        (l.company || '').toLowerCase().includes(q) ||
        (l.contact_name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <PageContainer
      title="Dead Leads & Dormant Opportunity Claiming"
      description="Claim dormant opportunities for active reactivation with automated 48-hour exclusivity locks, audit trail, and admin overrides."
    >
      <div className="space-y-6">
        {/* Banner */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Dead Lead Claiming & Lock Rules</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                  Fair-Share Sales Protocol
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Any representative can claim an unassigned dead lead. Claims grant exclusive 48h active outreach protection. Admins can unlock or override locks.
              </p>
            </div>
          </div>

          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Refresh Opportunities
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/80 border border-slate-800">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterMode === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Opportunities ({leads.length})
            </button>
            <button
              onClick={() => setFilterMode('unlocked')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterMode === 'unlocked'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Available to Claim ({leads.filter((l) => !l.is_locked).length})
            </button>
            <button
              onClick={() => setFilterMode('locked')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterMode === 'locked'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Under Exclusive Lock ({leads.filter((l) => l.is_locked).length})
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search company, contact, or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
            />
          </div>
        </div>

        {/* Leads Grid */}
        {loading ? (
          <div className="p-16 text-center text-slate-500">
            <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Loading dormant pipeline records...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-16 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
            <Flame className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-40" />
            <h4 className="text-sm font-semibold text-slate-300">No matching dormant opportunities</h4>
            <p className="text-xs text-slate-500 mt-1">
              Currently there are no dead leads requiring reactivation under this filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLeads.map((lead) => {
              const isLockedByMe = lead.locked_by === user?.id;
              const locker = employees.find((e) => e.id === lead.locked_by);

              return (
                <div
                  key={lead.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    lead.is_locked
                      ? 'bg-slate-900/80 border-amber-500/30'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70'
                  }`}
                >
                  <div>
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 uppercase">
                        {lead.stage}
                      </span>
                      {lead.is_locked ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-semibold">
                          <Lock className="w-3 h-3" />
                          Locked ({locker?.name ? locker.name.split(' ')[0] : 'Representative'})
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                          <Unlock className="w-3 h-3" />
                          Available to Claim
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-bold text-white tracking-tight">
                      {lead.company || lead.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium">{lead.title}</p>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Contact:</span>
                        <span className="font-medium text-slate-200">{lead.contact_name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Estimated Value:</span>
                        <span className="font-bold text-emerald-400 font-mono">
                          {formatCurrency(lead.value)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Source:</span>
                        <span className="text-slate-400 uppercase font-mono text-[10px]">{lead.source}</span>
                      </div>
                    </div>

                    {lead.notes && (
                      <p className="text-[11px] text-slate-400 italic bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 mt-3 line-clamp-2">
                        "{lead.notes}"
                      </p>
                    )}
                  </div>

                  {/* Actions Strip */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    {!lead.is_locked ? (
                      <button
                        onClick={() => handleClaimLead(lead.id)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                      >
                        <Flame className="w-3.5 h-3.5" />
                        Claim Lead Exclusively
                      </button>
                    ) : (
                      <div className="w-full flex items-center gap-2">
                        {(isLockedByMe || isAdmin) && (
                          <button
                            onClick={() => handleUnlockLead(lead.id)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all cursor-pointer"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            {isAdmin && !isLockedByMe ? 'Admin Override Unlock' : 'Release Lock'}
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setReassignModalLead(lead);
                              setSelectedAssignee(lead.assigned_to || '');
                            }}
                            className="flex items-center gap-1 py-1.5 px-2.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-medium transition-all cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Reassign
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Admin Reassignment Modal */}
      {reassignModalLead && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Reassign Sales Lead</h3>
              </div>
              <button
                onClick={() => setReassignModalLead(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select an active representative to reassign <span className="text-white font-semibold">{reassignModalLead.company}</span>. An audit log and persistent in-app notification will be recorded.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Assign To Representative</label>
              <select
                value={selectedAssignee}
                onChange={(e) => setSelectedAssignee(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500/60"
              >
                <option value="">-- Unassigned (General Pool) --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.department} - {emp.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setReassignModalLead(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReassignLead}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors"
              >
                Confirm Reassignment
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default DeadLeadsPage;
