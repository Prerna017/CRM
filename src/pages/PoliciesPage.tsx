import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { crmService } from '../services/crmService';
import { Policy, UserProfile } from '../types/database';
import { formatDate, formatDateTime } from '../lib/utils';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  BookOpen,
  ShieldCheck,
  Users,
  Eye,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const PoliciesPage: React.FC = () => {
  const { user, isAdmin, showToast } = useAuth();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  // Policy Viewer Modal
  const [activePolicy, setActivePolicy] = useState<Policy | null>(null);
  const [complianceData, setComplianceData] = useState<{
    rate: number;
    employees: { profile: UserProfile; acknowledged_at: string | null }[];
  } | null>(null);
  const [complianceLoading, setComplianceLoading] = useState(false);

  // Create Policy Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Code of Conduct');
  const [newVersion, setNewVersion] = useState('1.0');
  const [newSummary, setNewSummary] = useState('');
  const [newContent, setNewContent] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await crmService.getPolicies(user?.id || '');
      setPolicies(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const openPolicyViewer = async (pol: Policy) => {
    setActivePolicy(pol);
    if (isAdmin) {
      try {
        setComplianceLoading(true);
        const comp = await crmService.getPolicyCompliance(pol.id);
        setComplianceData(comp);
      } catch (err) {
        console.error(err);
      } finally {
        setComplianceLoading(false);
      }
    }
  };

  const handleAcknowledge = async (policyId: string) => {
    if (!user) return;
    try {
      await crmService.acknowledgePolicy(policyId, user.id);
      showToast('Policy acknowledged and signed successfully!', 'success');
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      loadData();
      if (activePolicy?.id === policyId) {
        setActivePolicy((prev) => (prev ? { ...prev, my_acknowledged_at: new Date().toISOString() } : null));
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to acknowledge policy', 'error');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      showToast('Title and content are required', 'error');
      return;
    }

    try {
      await crmService.createPolicy({
        title: newTitle.trim(),
        category: newCategory,
        version: newVersion,
        effective_date: new Date().toISOString().split('T')[0],
        summary: newSummary.trim() || undefined,
        content: newContent.trim(),
        created_by: user?.id || 'admin-001'
      });

      showToast('New policy published successfully!', 'success');
      setCreateOpen(false);
      setNewTitle('');
      setNewSummary('');
      setNewContent('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create policy', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Company Policies &amp; Compliance Handbook
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Official operational guidelines, code of ethics, information security protocols, and employee handbook.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all w-fit"
          >
            <Plus size={16} />
            <span>Publish New Policy</span>
          </button>
        )}
      </div>

      {/* Policies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {policies.map((pol) => {
          const isSigned = Boolean(pol.my_acknowledged_at);
          return (
            <div
              key={pol.id}
              className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                    {pol.category}
                  </span>
                  <span className="text-[10px] text-slate-500">v{pol.version}</span>
                </div>

                <h3 className="text-base font-bold text-white mt-2 leading-snug">{pol.title}</h3>
                <p className="text-xs text-slate-300 mt-2 line-clamp-3 leading-relaxed">
                  {pol.summary || pol.content}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
                <div>
                  {isSigned ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                      <CheckCircle2 size={13} />
                      <span>Acknowledged</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                      <AlertCircle size={13} />
                      <span>Sign-off Required</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!isSigned && (
                    <button
                      onClick={() => handleAcknowledge(pol.id)}
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm"
                    >
                      Sign Now
                    </button>
                  )}
                  <button
                    onClick={() => openPolicyViewer(pol)}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1"
                  >
                    <BookOpen size={13} />
                    <span>Read Policy</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* POLICY VIEWER MODAL */}
      {activePolicy && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                  {activePolicy.category} &bull; Version {activePolicy.version}
                </span>
                <h3 className="text-lg font-bold text-white mt-1">{activePolicy.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Effective Date: {formatDate(activePolicy.effective_date)}
                </p>
              </div>
              <button
                onClick={() => setActivePolicy(null)}
                className="text-slate-400 hover:text-white text-xl p-1"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-300 leading-relaxed">
              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800/80 whitespace-pre-line font-mono text-[11px] leading-relaxed">
                {activePolicy.content}
              </div>

              {/* Admin Compliance Stats Section */}
              {isAdmin && complianceData && (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck size={15} className="text-indigo-400" />
                      <span>Company Acknowledgment Compliance Rate</span>
                    </h4>
                    <span className="text-xs font-extrabold text-emerald-400">
                      {complianceData.rate}% Signed
                    </span>
                  </div>

                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${complianceData.rate}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                    {complianceData.employees.map((e) => (
                      <div key={e.profile.id} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
                        <div className="font-semibold text-white">{e.profile.name}</div>
                        {e.acknowledged_at ? (
                          <span className="text-emerald-400 font-medium">
                            Signed {formatDate(e.acknowledged_at)}
                          </span>
                        ) : (
                          <span className="text-amber-400 font-medium">Pending Sign-off</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div>
                {activePolicy.my_acknowledged_at ? (
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 size={15} />
                    <span>Signed by you on {formatDateTime(activePolicy.my_acknowledged_at)}</span>
                  </span>
                ) : (
                  <span className="text-xs text-amber-400">Please review and click agree to sign off</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActivePolicy(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Close
                </button>
                {!activePolicy.my_acknowledged_at && (
                  <button
                    onClick={() => handleAcknowledge(activePolicy.id)}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={15} />
                    <span>I Have Read &amp; Agree</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE POLICY MODAL */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Publish Company Policy</h3>
              <button onClick={() => setCreateOpen(false)} className="text-slate-400 hover:text-white text-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Policy Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Travel & Business Expense Reimbursement"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="Code of Conduct">Code of Conduct</option>
                    <option value="Remote Work">Remote Work</option>
                    <option value="Security & IT">Security & IT</option>
                    <option value="Leave & Attendance">Leave & Attendance</option>
                    <option value="Compensation & Benefits">Compensation & Benefits</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Version</label>
                  <input
                    type="text"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Executive Summary</label>
                <input
                  type="text"
                  placeholder="Brief 1-2 sentence overview of policy changes..."
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Policy Content / Articles *</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Write full policy sections, clauses, and guidelines..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
                >
                  Publish Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
