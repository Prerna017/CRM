import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { crmService } from '../services/crmService';
import { Lead, LeadStage, LeadPriority, LeadSource, LeadActivity, UserProfile } from '../types/database';
import { formatCurrency, formatDate, formatDateTime } from '../lib/utils';
import {
  Kanban,
  ListFilter,
  Plus,
  Search,
  DollarSign,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  ArrowRight,
  Send,
  MessageSquare,
  CheckCircle,
  XCircle,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';

const STAGES: { key: LeadStage; label: string; color: string }[] = [
  { key: 'new', label: 'New Inbound', color: 'border-cyan-500/40 bg-cyan-500/5' },
  { key: 'contacted', label: 'Contacted', color: 'border-blue-500/40 bg-blue-500/5' },
  { key: 'qualified', label: 'Qualified', color: 'border-indigo-500/40 bg-indigo-500/5' },
  { key: 'proposal', label: 'Proposal Sent', color: 'border-purple-500/40 bg-purple-500/5' },
  { key: 'won', label: 'Won / Closed', color: 'border-emerald-500/40 bg-emerald-500/5' },
  { key: 'lost', label: 'Lost / Closed', color: 'border-rose-500/40 bg-rose-500/5' },
];

export const LeadsPage: React.FC = () => {
  const { user, isAdmin, showToast } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  // Modals & Drawers
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLeadData, setSelectedLeadData] = useState<{
    lead: Lead;
    activities: LeadActivity[];
  } | null>(null);

  // New Lead Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newValue, setNewValue] = useState<number>(25000);
  const [newStage, setNewStage] = useState<LeadStage>('new');
  const [newPriority, setNewPriority] = useState<LeadPriority>('medium');
  const [newSource, setNewSource] = useState<LeadSource>('website');
  const [newAssignedTo, setNewAssignedTo] = useState<string>('');
  const [newExpectedDate, setNewExpectedDate] = useState<string>('');
  const [newNotes, setNewNotes] = useState('');

  // Activity Composer State
  const [actType, setActType] = useState<any>('reply');
  const [actTitle, setActTitle] = useState('');
  const [actContent, setActContent] = useState('');
  const [actFollowUp, setActFollowUp] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [leadsData, emps] = await Promise.all([
        crmService.getLeads(),
        crmService.getEmployees()
      ]);
      setLeads(leadsData);
      setEmployees(emps);
      if (!newAssignedTo && emps.length > 0) {
        setNewAssignedTo(user?.id || emps[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openLeadDrawer = async (leadId: string) => {
    setSelectedLeadId(leadId);
    try {
      const data = await crmService.getLeadById(leadId);
      setSelectedLeadData(data);
    } catch (err) {
      console.error(err);
    }
  };

  const closeLeadDrawer = () => {
    setSelectedLeadId(null);
    setSelectedLeadData(null);
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newCompany || !newContactName) {
      showToast('Title, Company, and Contact Name are required', 'error');
      return;
    }

    try {
      const created = await crmService.createLead({
        title: newTitle,
        company: newCompany,
        contact_name: newContactName,
        contact_email: newContactEmail || undefined,
        contact_phone: newContactPhone || undefined,
        value: Number(newValue) || 0,
        currency: 'USD',
        stage: newStage,
        priority: newPriority,
        source: newSource,
        assigned_to: newAssignedTo || user?.id,
        expected_close_date: newExpectedDate || undefined,
        notes: newNotes || undefined,
        created_by: user?.id
      });

      showToast(`Lead "${created.company}" created successfully!`, 'success');
      setCreateModalOpen(false);
      // Reset form
      setNewTitle('');
      setNewCompany('');
      setNewContactName('');
      setNewContactEmail('');
      setNewContactPhone('');
      setNewValue(25000);
      setNewNotes('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create lead', 'error');
    }
  };

  const handleMoveStage = async (leadId: string, targetStage: LeadStage) => {
    try {
      await crmService.updateLeadStage(leadId, targetStage, user?.id || 'user-001');
      if (targetStage === 'won') {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        showToast('Deal Closed as WON! Great job! 🚀', 'success');
      } else {
        showToast(`Lead moved to ${targetStage.toUpperCase()}`, 'info');
      }
      loadData();
      if (selectedLeadId === leadId) {
        openLeadDrawer(leadId);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update stage', 'error');
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !actContent) return;

    try {
      await crmService.addLeadActivity({
        lead_id: selectedLeadId,
        user_id: user?.id || 'user-001',
        activity_type: actType,
        title: actTitle || `${actType.toUpperCase()} Logged`,
        content: actContent,
        follow_up_date: actFollowUp || undefined
      });

      showToast('Activity logged successfully', 'success');
      setActContent('');
      setActTitle('');
      setActFollowUp('');
      openLeadDrawer(selectedLeadId);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to log activity', 'error');
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await crmService.deleteLead(leadId);
      showToast('Lead deleted', 'info');
      closeLeadDrawer();
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete', 'error');
    }
  };

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    // Non-admin can view leads assigned to them or unassigned
    if (!isAdmin && lead.assigned_to && lead.assigned_to !== user?.id) {
      return false;
    }
    if (selectedStage !== 'all' && lead.stage !== selectedStage) {
      return false;
    }
    if (selectedPriority !== 'all' && lead.priority !== selectedPriority) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        lead.title.toLowerCase().includes(q) ||
        lead.company.toLowerCase().includes(q) ||
        lead.contact_name.toLowerCase().includes(q) ||
        (lead.contact_email && lead.contact_email.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Sales Lead Pipeline</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAdmin ? 'Manage deals, assignments, follow-ups, and conversion stages.' : 'Your active sales prospects and customer conversations.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="p-1 rounded-xl bg-slate-900 border border-slate-800 flex items-center">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'kanban' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Kanban size={14} />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'list' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListFilter size={14} />
              <span>Table</span>
            </button>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
          >
            <Plus size={16} />
            <span>New Lead</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search leads by company, title, or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Stages</option>
            {STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* KANBAN BOARD VIEW */}
      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[640px]">
          {STAGES.map((col) => {
            const colLeads = filteredLeads.filter((l) => l.stage === col.key);
            const totalColValue = colLeads.reduce((sum, l) => sum + (l.value || 0), 0);

            return (
              <div
                key={col.key}
                className="w-72 flex-shrink-0 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col max-h-[750px]"
              >
                {/* Column Header */}
                <div className={`p-4 border-b border-slate-800/80 rounded-t-2xl flex items-center justify-between ${col.color}`}>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      {col.label}
                    </h3>
                    <p className="text-[11px] font-semibold text-emerald-400 mt-0.5">
                      {formatCurrency(totalColValue)}
                    </p>
                  </div>
                  <span className="w-6 h-6 rounded-full bg-slate-800/80 text-white text-xs font-bold flex items-center justify-center">
                    {colLeads.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="p-3 overflow-y-auto space-y-3 flex-1">
                  {colLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => openLeadDrawer(lead.id)}
                      className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all shadow-md hover:-translate-y-0.5 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider truncate">
                          {lead.company}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                            lead.priority === 'urgent'
                              ? 'bg-rose-500/20 text-rose-300'
                              : lead.priority === 'high'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {lead.priority}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white mt-1.5 leading-snug line-clamp-2">
                        {lead.title}
                      </h4>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-800/60 pt-2.5">
                        <span className="text-xs font-extrabold text-emerald-400">
                          {formatCurrency(lead.value)}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {lead.assignee && (
                            <img
                              src={lead.assignee.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${lead.assignee.name}`}
                              alt={lead.assignee.name}
                              title={`Assigned to ${lead.assignee.name}`}
                              className="w-5 h-5 rounded-full object-cover border border-slate-700"
                            />
                          )}
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                            <MessageSquare size={11} />
                            {lead.activities_count || 0}
                          </span>
                        </div>
                      </div>

                      {/* Quick Move Stage Select */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="mt-3 pt-2 border-t border-slate-800/40 flex items-center justify-between gap-1 text-[10px]"
                      >
                        <span className="text-slate-500">Move to:</span>
                        <select
                          value={lead.stage}
                          onChange={(e) => handleMoveStage(lead.id, e.target.value as LeadStage)}
                          className="bg-slate-950 border border-slate-800 text-slate-300 text-[10px] rounded px-1.5 py-0.5"
                        >
                          {STAGES.map((st) => (
                            <option key={st.key} value={st.key}>
                              {st.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}

                  {colLeads.length === 0 && (
                    <div className="py-12 text-center text-slate-600 text-xs">
                      No deals in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE LIST VIEW */}
      {viewMode === 'list' && (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-4">Deal Title</th>
                  <th className="p-4">Company</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Value</th>
                  <th className="p-4">Stage</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Assigned Rep</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => openLeadDrawer(lead.id)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="p-4 font-bold text-white max-w-[200px] truncate">{lead.title}</td>
                    <td className="p-4 text-indigo-400 font-medium">{lead.company}</td>
                    <td className="p-4 text-slate-300">
                      <div>{lead.contact_name}</div>
                      <div className="text-[10px] text-slate-500">{lead.contact_email}</div>
                    </td>
                    <td className="p-4 font-extrabold text-emerald-400">{formatCurrency(lead.value)}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                        {lead.stage}
                      </span>
                    </td>
                    <td className="p-4">
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
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {lead.assignee && (
                          <img
                            src={lead.assignee.avatar_url}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        )}
                        <span className="text-slate-300">{lead.assignee?.name || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openLeadDrawer(lead.id);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                      >
                        Details &rarr;
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No matching leads found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE LEAD MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Create New Sales Lead</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Company / Organization *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Health Corp"
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Deal Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Enterprise Cloud Deployment"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Contact Person Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Johnathan Doe"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Contact Email</label>
                  <input
                    type="email"
                    placeholder="john@company.com"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Estimated Deal Value ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={newValue}
                    onChange={(e) => setNewValue(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Initial Stage</label>
                  <select
                    value={newStage}
                    onChange={(e) => setNewStage(e.target.value as LeadStage)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {STAGES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as LeadPriority)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Source</label>
                  <select
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value as LeadSource)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="website">Website Inbound</option>
                    <option value="referral">Customer Referral</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="cold_outreach">Cold Outreach</option>
                    <option value="partner">Partner</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Assign To Rep</label>
                  <select
                    value={newAssignedTo}
                    onChange={(e) => setNewAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.department})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Discovery Notes</label>
                <textarea
                  rows={3}
                  placeholder="Key requirements, budget timeline, decision maker notes..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
                >
                  Create Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEAD DETAILS & ACTIVITY LOG DRAWER */}
      {selectedLeadData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end animate-in fade-in">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-2xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950/60">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                  {selectedLeadData.lead.company}
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">{selectedLeadData.lead.title}</h3>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="font-extrabold text-emerald-400">
                    {formatCurrency(selectedLeadData.lead.value)}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    {selectedLeadData.lead.stage}
                  </span>
                  <span className="text-slate-400">
                    Assigned: {selectedLeadData.lead.assignee?.name || 'Unassigned'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteLead(selectedLeadData.lead.id)}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Delete lead"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  onClick={closeLeadDrawer}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 text-lg"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Quick Move Stage Banner */}
            <div className="px-6 py-3 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold">Change Stage:</span>
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {STAGES.map((st) => (
                  <button
                    key={st.key}
                    onClick={() => handleMoveStage(selectedLeadData.lead.id, st.key)}
                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                      selectedLeadData.lead.stage === st.key
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Drawer Body - Split into Contact & Timeline */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Contact Info Grid */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 font-medium block">Contact Person</span>
                  <span className="font-semibold text-white">{selectedLeadData.lead.contact_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Email Address</span>
                  <a
                    href={`mailto:${selectedLeadData.lead.contact_email}`}
                    className="font-semibold text-indigo-400 hover:underline"
                  >
                    {selectedLeadData.lead.contact_email || '—'}
                  </a>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Phone Number</span>
                  <span className="font-semibold text-white">{selectedLeadData.lead.contact_phone || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Source Channel</span>
                  <span className="font-semibold text-slate-300 capitalize">{selectedLeadData.lead.source}</span>
                </div>
                {selectedLeadData.lead.notes && (
                  <div className="col-span-2 pt-2 border-t border-slate-800/60">
                    <span className="text-slate-500 font-medium block mb-1">Lead Notes</span>
                    <p className="text-slate-300 leading-relaxed">{selectedLeadData.lead.notes}</p>
                  </div>
                )}
              </div>

              {/* Activity / Conversation Composer */}
              <form onSubmit={handleAddActivity} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-indigo-400" />
                    <span>Log Follow-up / Client Reply</span>
                  </h4>
                  <select
                    value={actType}
                    onChange={(e) => setActType(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-[11px] text-slate-300 rounded px-2 py-1"
                  >
                    <option value="reply">Client Email / Reply</option>
                    <option value="call">Phone Call</option>
                    <option value="meeting">Video Meeting</option>
                    <option value="note">Internal Note</option>
                  </select>
                </div>

                <input
                  type="text"
                  placeholder="Subject or summary title..."
                  value={actTitle}
                  onChange={(e) => setActTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />

                <textarea
                  rows={2}
                  required
                  placeholder="Enter notes, reply text, discussion recap..."
                  value={actContent}
                  onChange={(e) => setActContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Follow-up:</span>
                    <input
                      type="date"
                      value={actFollowUp}
                      onChange={(e) => setActFollowUp(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Send size={13} />
                    <span>Save Log</span>
                  </button>
                </div>
              </form>

              {/* Activity Timeline List */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Activity Timeline</h4>
                {selectedLeadData.activities.map((act) => (
                  <div key={act.id} className="relative pl-6 pb-4 border-l-2 border-slate-800 last:border-transparent">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-900 border-2 border-indigo-500" />
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{act.title || act.activity_type}</span>
                        <span className="text-[10px] text-slate-500">{formatDateTime(act.created_at)}</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">{act.content}</p>
                      {act.follow_up_date && (
                        <div className="mt-2 text-[10px] font-semibold text-amber-400 flex items-center gap-1">
                          <Calendar size={11} />
                          <span>Follow-up scheduled: {formatDate(act.follow_up_date)}</span>
                        </div>
                      )}
                      <p className="text-[10px] text-slate-500 mt-1.5">
                        Logged by {act.user?.name || 'Staff Member'}
                      </p>
                    </div>
                  </div>
                ))}

                {selectedLeadData.activities.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">No activity logged yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
