import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { crmService } from '../services/crmService';
import { Policy, PolicyVersion, UserProfile, PublicationStatus } from '../types/database';
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
  History,
  Archive,
  Edit3,
  Calendar,
  Search,
  Filter,
  Layers,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Check,
  Clock
} from 'lucide-react';
import confetti from 'canvas-confetti';

const POLICY_CATEGORIES = [
  'All',
  'Attendance',
  'Leave and holidays',
  'Working hours',
  'Work from home',
  'Employee conduct',
  'Confidentiality',
  'CRM and lead ownership',
  'Communication',
  'Data security'
];

export const PoliciesPage: React.FC = () => {
  const { user, isAdmin, showToast } = useAuth();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [statusTab, setStatusTab] = useState<'published' | 'draft' | 'archived'>('published');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Policy Viewer Modal
  const [activePolicy, setActivePolicy] = useState<Policy | null>(null);
  const [complianceData, setComplianceData] = useState<{
    rate: number;
    version: string;
    totalEligible: number;
    signedCount: number;
    employees: { profile: UserProfile; acknowledged_at: string | null; version: string }[];
  } | null>(null);
  const [complianceLoading, setComplianceLoading] = useState(false);

  // Version History Modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [policyVersions, setPolicyVersions] = useState<PolicyVersion[]>([]);
  const [historyTargetPolicy, setHistoryTargetPolicy] = useState<Policy | null>(null);

  // Create Policy Modal (Admin Only)
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Employee conduct');
  const [newVersion, setNewVersion] = useState('1.0');
  const [newSummary, setNewSummary] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newStatus, setNewStatus] = useState<PublicationStatus>('published');
  const [newEffectiveDate, setNewEffectiveDate] = useState(new Date().toISOString().split('T')[0]);

  // Revise Policy Modal (Admin Only)
  const [reviseOpen, setReviseOpen] = useState(false);
  const [revisingPolicy, setRevisingPolicy] = useState<Policy | null>(null);
  const [revisedTitle, setRevisedTitle] = useState('');
  const [revisedCategory, setRevisedCategory] = useState('');
  const [revisedVersion, setRevisedVersion] = useState('');
  const [revisedEffectiveDate, setRevisedEffectiveDate] = useState('');
  const [revisedSummary, setRevisedSummary] = useState('');
  const [revisedContent, setRevisedContent] = useState('');
  const [changeSummary, setChangeSummary] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await crmService.getPolicies(user?.id, {
        status: isAdmin ? statusTab : 'published',
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        search: searchQuery.trim() || undefined
      });
      setPolicies(data);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to load policies', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user, statusTab, selectedCategory, searchQuery]);

  const openPolicyViewer = async (pol: Policy) => {
    setActivePolicy(pol);
    if (isAdmin) {
      try {
        setComplianceLoading(true);
        const comp = await crmService.getPolicyCompliance(pol.id, pol.version);
        setComplianceData(comp);
      } catch (err) {
        console.error(err);
      } finally {
        setComplianceLoading(false);
      }
    }
  };

  const openVersionHistory = async (pol: Policy) => {
    try {
      setHistoryTargetPolicy(pol);
      setHistoryModalOpen(true);
      const versions = await crmService.getPolicyVersions(pol.id);
      setPolicyVersions(versions);
    } catch (err: any) {
      showToast(err.message || 'Failed to load version history', 'error');
    }
  };

  const handleAcknowledge = async (policyId: string, version: string) => {
    if (!user) return;
    try {
      await crmService.acknowledgePolicy(policyId, version, user.id);
      showToast(`Policy version ${version} acknowledged and logged!`, 'success');
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      loadData();
      if (activePolicy?.id === policyId) {
        setActivePolicy((prev) =>
          prev ? { ...prev, my_acknowledged_at: new Date().toISOString(), is_acknowledged: true } : null
        );
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
      await crmService.createPolicy(
        {
          title: newTitle.trim(),
          category: newCategory,
          version: newVersion.trim() || '1.0',
          effective_date: newEffectiveDate,
          summary: newSummary.trim() || undefined,
          content: newContent.trim(),
          status: newStatus,
          created_by: user?.id || 'admin-001'
        },
        user?.id
      );

      showToast('New policy published successfully!', 'success');
      setCreateOpen(false);
      setNewTitle('');
      setNewSummary('');
      setNewContent('');
      setNewVersion('1.0');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create policy', 'error');
    }
  };

  const openReviseModal = (pol: Policy) => {
    setRevisingPolicy(pol);
    setRevisedTitle(pol.title);
    setRevisedCategory(pol.category);
    // Suggest incrementing minor version, e.g., 2.1 -> 2.2
    const parts = pol.version.split('.');
    const nextMinor = parts.length === 2 && !isNaN(Number(parts[1])) ? `${parts[0]}.${Number(parts[1]) + 1}` : `${pol.version}.1`;
    setRevisedVersion(nextMinor);
    setRevisedEffectiveDate(new Date().toISOString().split('T')[0]);
    setRevisedSummary(pol.summary || '');
    setRevisedContent(pol.content);
    setChangeSummary('');
    setReviseOpen(true);
  };

  const handleReviseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisingPolicy) return;
    if (!revisedTitle.trim() || !revisedContent.trim()) {
      showToast('Title and content are required', 'error');
      return;
    }

    try {
      await crmService.updatePolicy(
        revisingPolicy.id,
        {
          title: revisedTitle.trim(),
          category: revisedCategory,
          version: revisedVersion.trim(),
          effective_date: revisedEffectiveDate,
          summary: revisedSummary.trim() || undefined,
          content: revisedContent.trim(),
          change_summary: changeSummary.trim() || `Revised to version ${revisedVersion}`
        },
        user?.id
      );

      showToast(`Policy successfully updated to v${revisedVersion}! Previous version preserved in archive.`, 'success');
      setReviseOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to revise policy', 'error');
    }
  };

  const handleArchivePolicy = async (id: string) => {
    if (!window.confirm('Archive this official company policy? It will be preserved under retention rules.')) return;
    try {
      await crmService.archivePolicy(id, user?.id);
      showToast('Policy archived and retention flags updated', 'info');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to archive policy', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BookOpen size={20} />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                Company Policies &amp; Compliance Handbook
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Official operational standards, ethics code, confidentiality, IT protocols, and version-tracked sign-offs.
              </p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all w-fit"
          >
            <Plus size={16} />
            <span>Publish New Policy</span>
          </button>
        )}
      </div>

      {/* Tabs & Search Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        {/* Status Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusTab('published')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              statusTab === 'published'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileText size={13} />
            <span>Active Policies</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setStatusTab('draft')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                statusTab === 'draft'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Edit3 size={13} />
              <span>Drafts</span>
            </button>
          )}

          <button
            onClick={() => setStatusTab('archived')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              statusTab === 'archived'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Archive size={13} />
            <span>Retention Archive</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
          <input
            type="text"
            placeholder="Search policies &amp; protocols..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {POLICY_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap border ${
              selectedCategory === cat
                ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 font-semibold'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Policies Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading company policies...</div>
      ) : policies.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
          <BookOpen className="mx-auto text-slate-600 mb-3" size={32} />
          <h3 className="text-base font-bold text-white">No policies found</h3>
          <p className="text-xs text-slate-400 mt-1">
            {statusTab === 'draft'
              ? 'No draft policies currently in formulation.'
              : statusTab === 'archived'
              ? 'No policies in statutory retention archive.'
              : 'No published policies match your selected category or query.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {policies.map((pol) => {
            const isSigned = Boolean(pol.my_acknowledged_at);
            return (
              <div
                key={pol.id}
                className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                      {pol.category}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-950 text-indigo-400 border border-slate-800">
                        v{pol.version}
                      </span>

                      {pol.status === 'draft' && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          Draft
                        </span>
                      )}

                      {pol.status === 'archived' && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          Archived
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white mt-2.5 leading-snug">{pol.title}</h3>
                  <p className="text-xs text-slate-300 mt-2 line-clamp-3 leading-relaxed">
                    {pol.summary || pol.content}
                  </p>

                  <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-2">
                    <span>Effective: {formatDate(pol.effective_date)}</span>
                    <span>•</span>
                    <span>Updated: {formatDate(pol.updated_at)}</span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    {pol.status === 'published' && (
                      <div>
                        {isSigned ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                            <CheckCircle2 size={13} />
                            <span>Signed v{pol.version}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                            <AlertCircle size={13} />
                            <span>Sign-off Required (v{pol.version})</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Employee Sign Button */}
                    {!isSigned && pol.status === 'published' && (
                      <button
                        onClick={() => handleAcknowledge(pol.id, pol.version)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm flex items-center gap-1"
                      >
                        <ShieldCheck size={13} />
                        <span>Sign v{pol.version}</span>
                      </button>
                    )}

                    {/* Version History Button */}
                    <button
                      onClick={() => openVersionHistory(pol)}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="View Version History & Archived Changelogs"
                    >
                      <History size={15} />
                    </button>

                    {/* Admin Revision Button */}
                    {isAdmin && pol.status !== 'archived' && (
                      <button
                        onClick={() => openReviseModal(pol)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        title="Revise / Bump Policy Version"
                      >
                        <Edit3 size={15} />
                      </button>
                    )}

                    {/* Admin Archive Button */}
                    {isAdmin && pol.status !== 'archived' && (
                      <button
                        onClick={() => handleArchivePolicy(pol.id)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Archive Policy"
                      >
                        <Archive size={15} />
                      </button>
                    )}

                    {/* Read Policy Reader Button */}
                    <button
                      onClick={() => openPolicyViewer(pol)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1"
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
      )}

      {/* POLICY VIEWER MODAL */}
      {activePolicy && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl p-6 shadow-2xl animate-in zoom-in-95 my-8">
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                    {activePolicy.category}
                  </span>
                  <span className="text-xs text-indigo-400 font-bold">Version {activePolicy.version}</span>
                  <span className="text-xs text-slate-500">Effective: {formatDate(activePolicy.effective_date)}</span>
                </div>
                <h3 className="text-xl font-bold text-white pt-1">{activePolicy.title}</h3>
              </div>
              <button onClick={() => setActivePolicy(null)} className="text-slate-400 hover:text-white text-xl">
                &times;
              </button>
            </div>

            <div className="mt-4 space-y-6">
              {/* Compliance & Sign-off Status Banner */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="text-indigo-400" size={15} />
                    <span>Your Verification Status</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {activePolicy.my_acknowledged_at
                      ? `Signed for version ${activePolicy.version} on ${formatDateTime(activePolicy.my_acknowledged_at)}`
                      : `Awaiting your formal signature for version ${activePolicy.version}.`}
                  </p>
                </div>

                {!activePolicy.my_acknowledged_at && activePolicy.status === 'published' ? (
                  <button
                    onClick={() => handleAcknowledge(activePolicy.id, activePolicy.version)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 shrink-0"
                  >
                    <CheckCircle2 size={15} />
                    <span>Sign Version {activePolicy.version}</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-xs font-bold shrink-0">
                    <CheckCircle2 size={14} />
                    <span>Verified &amp; Signed</span>
                  </span>
                )}
              </div>

              {/* Policy Content */}
              <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-line max-h-96 overflow-y-auto font-mono text-[11px]">
                {activePolicy.content}
              </div>

              {/* Admin Compliance Audit Breakdown */}
              {isAdmin && complianceData && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Users className="text-indigo-400" size={14} />
                      <span>Company-Wide Sign-off Compliance (v{complianceData.version})</span>
                    </h4>
                    <span className="text-xs font-extrabold text-indigo-400">{complianceData.rate}% Signed</span>
                  </div>

                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${complianceData.rate}%` }} />
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1.5 pt-1 pr-1">
                    {complianceData.employees.map((e) => (
                      <div
                        key={e.profile.id}
                        className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-slate-900 border border-slate-800"
                      >
                        <span className="text-slate-300 font-medium">
                          {e.profile.name} ({e.profile.department})
                        </span>
                        {e.acknowledged_at ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <Check size={11} />
                            <span>Signed {formatDate(e.acknowledged_at)}</span>
                          </span>
                        ) : (
                          <span className="text-amber-400">Awaiting Sign-off</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                <button
                  onClick={() => openVersionHistory(activePolicy)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                >
                  <History size={13} />
                  <span>View Prior Version Archive</span>
                </button>

                <button
                  onClick={() => setActivePolicy(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Close Handbook
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VERSION HISTORY MODAL */}
      {historyModalOpen && historyTargetPolicy && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl p-6 shadow-2xl animate-in zoom-in-95 my-8">
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <History className="text-indigo-400" size={18} />
                  <span>Version History &amp; Acknowledgement Archive</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{historyTargetPolicy.title}</p>
              </div>
              <button onClick={() => setHistoryModalOpen(false)} className="text-slate-400 hover:text-white text-xl">
                &times;
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/25 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-300">Active Live Version</span>
                  <h4 className="text-xs font-bold text-white mt-0.5">Version {historyTargetPolicy.version}</h4>
                  <p className="text-[11px] text-slate-400">
                    Effective {formatDate(historyTargetPolicy.effective_date)}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                  Current Official Version
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Historical Archived Versions &amp; Sign-off Records
                </h4>

                {policyVersions.length === 0 ? (
                  <p className="text-xs text-slate-500 p-4 text-center rounded-xl bg-slate-950 border border-slate-800">
                    No prior archived versions exist for this policy. This is the initial version 1.0.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {policyVersions.map((v) => (
                      <div
                        key={v.id}
                        className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-400">Version {v.version}</span>
                          <span className="text-[11px] text-slate-500">
                            Archived on {formatDate(v.archived_at)}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 italic">
                          Changelog: {v.change_summary || 'Policy revision and update.'}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                          <span>Effective period: {v.effective_date}</span>
                          <span className="text-emerald-400 font-semibold">
                            {v.acknowledged_count || 0} historical employee acknowledgements preserved
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-800">
                <button
                  onClick={() => setHistoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Close History
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW POLICY MODAL (ADMIN ONLY) */}
      {createOpen && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl p-6 shadow-2xl animate-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Publish New Company Policy</h3>
              <button onClick={() => setCreateOpen(false)} className="text-slate-400 hover:text-white text-xl">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Policy Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Employee Remote Collaboration & Security Standards"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Standard Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {POLICY_CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Initial Version</label>
                  <input
                    type="text"
                    required
                    placeholder="1.0"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Effective Date</label>
                  <input
                    type="date"
                    required
                    value={newEffectiveDate}
                    onChange={(e) => setNewEffectiveDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Publication Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as PublicationStatus)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="published">Published (Live for Employee Sign-off)</option>
                  <option value="draft">Draft (Visible Only to Admins)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Executive Summary</label>
                <input
                  type="text"
                  placeholder="Concise overview of policy guidelines..."
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Full Policy Document Content (Markdown / Text) *
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="### 1. Scope & Guidelines&#10;Write detailed policy requirements..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
                >
                  {newStatus === 'draft' ? 'Save Draft Policy' : 'Publish Official Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVISE POLICY MODAL (ADMIN ONLY) */}
      {reviseOpen && revisingPolicy && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl p-6 shadow-2xl animate-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Revise Official Policy &amp; Bump Version</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Current version {revisingPolicy.version} will be preserved in the archive alongside all historical sign-offs.
                </p>
              </div>
              <button onClick={() => setReviseOpen(false)} className="text-slate-400 hover:text-white text-xl">
                &times;
              </button>
            </div>

            <form onSubmit={handleReviseSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Policy Title *</label>
                <input
                  type="text"
                  required
                  value={revisedTitle}
                  onChange={(e) => setRevisedTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Category</label>
                  <select
                    value={revisedCategory}
                    onChange={(e) => setRevisedCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {POLICY_CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">New Version Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="2.2"
                    value={revisedVersion}
                    onChange={(e) => setRevisedVersion(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold text-indigo-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Effective Date</label>
                  <input
                    type="date"
                    required
                    value={revisedEffectiveDate}
                    onChange={(e) => setRevisedEffectiveDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Changelog Summary (Preserved in Version History) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Added section 3.2 on mandatory hardware encryption and MFA rotation."
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Updated Executive Summary</label>
                <input
                  type="text"
                  value={revisedSummary}
                  onChange={(e) => setRevisedSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Updated Policy Document Content *
                </label>
                <textarea
                  rows={6}
                  required
                  value={revisedContent}
                  onChange={(e) => setRevisedContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReviseOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
                >
                  Save Revision &amp; Preserve Prior v{revisingPolicy.version}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
