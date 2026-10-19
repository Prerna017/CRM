import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { crmService } from '../services/crmService';
import { Announcement, NoticePriority, PublicationStatus, UserProfile } from '../types/database';
import { formatDate, formatDateTime } from '../lib/utils';
import {
  Megaphone,
  Pin,
  Plus,
  Trash2,
  AlertTriangle,
  Calendar,
  Layers,
  CheckCircle2,
  Eye,
  FileText,
  Clock,
  Paperclip,
  Archive,
  Send,
  Users,
  Search,
  Filter,
  Check,
  Edit3,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const AnnouncementsPage: React.FC = () => {
  const { user, isAdmin, showToast } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [statusTab, setStatusTab] = useState<'published' | 'scheduled' | 'draft' | 'archived'>('published');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Create / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Announcement | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>('general');
  const [priority, setPriority] = useState<NoticePriority>('normal');
  const [status, setStatus] = useState<PublicationStatus>('published');
  const [publishedAt, setPublishedAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [requiresAck, setRequiresAck] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [targetDept, setTargetDept] = useState('all');

  // Audit Receipts Modal
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditData, setAuditData] = useState<{
    notice: Announcement;
    reads: { user: UserProfile; read_at: string }[];
    acknowledgements: { user: UserProfile; acknowledged_at: string }[];
    pendingEmployees: UserProfile[];
    readRate: number;
    ackRate: number;
    totalEligible: number;
  } | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // Detail / Read Notice Modal
  const [viewNotice, setViewNotice] = useState<Announcement | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await crmService.getNotices(user?.id, {
        status: isAdmin ? (statusTab === 'scheduled' ? 'published' : statusTab) : 'published',
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        priority: selectedPriority !== 'all' ? (selectedPriority as NoticePriority) : undefined,
        search: searchQuery.trim() || undefined
      });

      // Filter scheduled client-side if on scheduled tab
      let filtered = data;
      const now = new Date();
      if (isAdmin && statusTab === 'scheduled') {
        filtered = data.filter((n) => new Date(n.published_at) > now);
      } else if (isAdmin && statusTab === 'published') {
        filtered = data.filter((n) => new Date(n.published_at) <= now);
      }

      setAnnouncements(filtered);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to load notices', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, statusTab, selectedCategory, selectedPriority, searchQuery]);

  const openCreateModal = () => {
    setEditingNotice(null);
    setTitle('');
    setContent('');
    setCategory('general');
    setPriority('normal');
    setStatus('published');
    setPublishedAt(new Date().toISOString().slice(0, 16));
    setExpiresAt('');
    setAttachmentUrl('');
    setRequiresAck(false);
    setIsPinned(false);
    setTargetDept('all');
    setModalOpen(true);
  };

  const openEditModal = (notice: Announcement) => {
    setEditingNotice(notice);
    setTitle(notice.title);
    setContent(notice.content || notice.message || '');
    setCategory(notice.category);
    setPriority(notice.priority);
    setStatus(notice.status);
    setPublishedAt(notice.published_at ? new Date(notice.published_at).toISOString().slice(0, 16) : '');
    setExpiresAt(notice.expires_at ? new Date(notice.expires_at).toISOString().slice(0, 16) : '');
    setAttachmentUrl(notice.attachment_url || '');
    setRequiresAck(Boolean(notice.requires_acknowledgement));
    setIsPinned(Boolean(notice.is_pinned));
    setTargetDept(notice.target_department || 'all');
    setModalOpen(true);
  };

  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      showToast('Title and content are required', 'error');
      return;
    }

    try {
      if (editingNotice) {
        await crmService.updateNotice(
          editingNotice.id,
          {
            title: title.trim(),
            content: content.trim(),
            message: content.trim(),
            category,
            priority,
            status,
            published_at: publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString(),
            expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
            attachment_url: attachmentUrl.trim() || null,
            requires_acknowledgement: requiresAck,
            is_pinned: isPinned,
            target_department: targetDept
          },
          user?.id
        );
        showToast('Notice updated successfully!', 'success');
      } else {
        await crmService.createNotice(
          {
            title: title.trim(),
            content: content.trim(),
            message: content.trim(),
            category,
            priority,
            status,
            published_at: publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString(),
            expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
            attachment_url: attachmentUrl.trim() || null,
            requires_acknowledgement: requiresAck,
            is_pinned: isPinned,
            target_department: targetDept,
            created_by: user?.id || 'admin-001'
          },
          user?.id
        );
        showToast('Company notice published successfully!', 'success');
      }

      setModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save notice', 'error');
    }
  };

  const handleArchive = async (id: string) => {
    if (!window.confirm('Are you sure you want to archive this notice? It will be moved to the company archive.')) return;
    try {
      await crmService.archiveNotice(id, user?.id);
      showToast('Notice archived successfully', 'info');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to archive notice', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this notice permanently?')) return;
    try {
      await crmService.deleteAnnouncement(id, user?.id);
      showToast('Notice removed', 'info');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete notice', 'error');
    }
  };

  const handleTogglePin = async (id: string) => {
    try {
      const newPin = await crmService.togglePinAnnouncement(id);
      showToast(newPin ? 'Notice pinned to top' : 'Notice unpinned', 'info');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update pin', 'error');
    }
  };

  const handleMarkAsRead = async (noticeId: string) => {
    if (!user) return;
    try {
      await crmService.markNoticeAsRead(noticeId, user.id);
      showToast('Marked as read', 'info');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to mark as read', 'error');
    }
  };

  const handleAcknowledge = async (noticeId: string) => {
    if (!user) return;
    try {
      await crmService.acknowledgeNotice(noticeId, user.id);
      confetti({ particleCount: 45, spread: 60, origin: { y: 0.7 } });
      showToast('Notice acknowledged and logged!', 'success');
      loadData();
      if (viewNotice?.id === noticeId) {
        setViewNotice((prev) => (prev ? { ...prev, is_acknowledged: true, acknowledged_at: new Date().toISOString() } : null));
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to acknowledge notice', 'error');
    }
  };

  const openAuditModal = async (noticeId: string) => {
    try {
      setAuditLoading(true);
      setAuditModalOpen(true);
      const audit = await crmService.getNoticeAudit(noticeId, user?.id);
      setAuditData(audit);
    } catch (err: any) {
      showToast(err.message || 'Failed to load audit receipts', 'error');
      setAuditModalOpen(false);
    } finally {
      setAuditLoading(false);
    }
  };

  const openNoticeDetail = (notice: Announcement) => {
    setViewNotice(notice);
    if (user && !notice.is_read) {
      crmService.markNoticeAsRead(notice.id, user.id).then(() => loadData());
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Megaphone size={20} />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                Important Notices &amp; Broadcasts
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Official company-wide alerts, executive announcements, operational directives, and acknowledgements.
              </p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all w-fit"
          >
            <Plus size={16} />
            <span>Create New Notice</span>
          </button>
        )}
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusTab('published')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              statusTab === 'published'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Send size={13} />
            <span>Published</span>
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => setStatusTab('scheduled')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  statusTab === 'scheduled'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Clock size={13} />
                <span>Scheduled</span>
              </button>

              <button
                onClick={() => setStatusTab('draft')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  statusTab === 'draft'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <FileText size={13} />
                <span>Drafts</span>
              </button>

              <button
                onClick={() => setStatusTab('archived')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  statusTab === 'archived'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Archive size={13} />
                <span>Archived</span>
              </button>
            </>
          )}
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
            <input
              type="text"
              placeholder="Search notices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="important">Important</option>
            <option value="normal">Normal</option>
          </select>
        </div>
      </div>

      {/* Notices Stream */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading notices...</div>
      ) : announcements.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
          <Megaphone className="mx-auto text-slate-600 mb-3" size={32} />
          <h3 className="text-base font-bold text-white">No notices found</h3>
          <p className="text-xs text-slate-400 mt-1">
            {statusTab === 'draft'
              ? 'There are no unpublished draft notices at this time.'
              : statusTab === 'scheduled'
              ? 'No upcoming scheduled notices queued.'
              : 'No company notices match your selected filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((notice) => {
            const isUrgent = notice.priority.toLowerCase() === 'urgent';
            const isImportant = notice.priority.toLowerCase() === 'important';
            const isScheduled = new Date(notice.published_at) > new Date();
            const isExpired = notice.expires_at ? new Date(notice.expires_at) < new Date() : false;

            return (
              <div
                key={notice.id}
                className={`p-6 rounded-2xl bg-slate-900/70 border transition-all shadow-md ${
                  notice.is_pinned
                    ? 'border-indigo-500/50 shadow-indigo-500/10 shadow-xl'
                    : isUrgent
                    ? 'border-rose-500/40 bg-gradient-to-r from-rose-950/20 via-slate-900/70 to-slate-900/70'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {notice.is_pinned && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          <Pin size={11} className="rotate-45" />
                          <span>PINNED</span>
                        </span>
                      )}

                      {/* Priority Badge */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                          isUrgent
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm shadow-rose-500/20'
                            : isImportant
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {isUrgent && <AlertTriangle size={11} />}
                        <span>{notice.priority}</span>
                      </span>

                      {/* Category Badge */}
                      <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                        {notice.category}
                      </span>

                      {/* Status / Scheduled Badge */}
                      {notice.status === 'draft' && (
                        <span className="text-[10px] uppercase font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/25">
                          Draft
                        </span>
                      )}
                      {notice.status === 'archived' && (
                        <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                          Archived
                        </span>
                      )}
                      {isScheduled && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-400 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/25">
                          <Clock size={10} />
                          <span>Scheduled for {formatDate(notice.published_at)}</span>
                        </span>
                      )}

                      {/* Expiry Pill */}
                      {notice.expires_at && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded border ${
                            isExpired
                              ? 'bg-rose-950/40 text-rose-400 border-rose-800/50'
                              : 'bg-slate-950 text-slate-400 border-slate-800'
                          }`}
                        >
                          {isExpired ? 'Expired' : `Expires: ${formatDate(notice.expires_at)}`}
                        </span>
                      )}

                      <span className="text-[10px] text-slate-500">
                        Audience: {notice.target_department === 'all' ? 'Entire Organization' : `${notice.target_department} Dept`}
                      </span>
                    </div>

                    <h3
                      onClick={() => openNoticeDetail(notice)}
                      className="text-lg font-bold text-white hover:text-indigo-300 cursor-pointer transition-colors"
                    >
                      {notice.title}
                    </h3>
                  </div>

                  {/* Top Right Admin Controls */}
                  {isAdmin && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => openAuditModal(notice.id)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 flex items-center gap-1 transition-all"
                        title="View Read Receipts & Acknowledgement Audit"
                      >
                        <Users size={13} />
                        <span>Audit ({notice.read_count || 0})</span>
                      </button>

                      <button
                        onClick={() => handleTogglePin(notice.id)}
                        className={`p-1.5 rounded-lg text-xs transition-colors ${
                          notice.is_pinned
                            ? 'text-indigo-400 bg-indigo-500/10'
                            : 'text-slate-500 hover:text-white hover:bg-slate-800'
                        }`}
                        title={notice.is_pinned ? 'Unpin' : 'Pin to top'}
                      >
                        <Pin size={15} />
                      </button>

                      <button
                        onClick={() => openEditModal(notice)}
                        className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        title="Edit Notice"
                      >
                        <Edit3 size={15} />
                      </button>

                      {notice.status !== 'archived' && (
                        <button
                          onClick={() => handleArchive(notice.id)}
                          className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Archive Notice"
                        >
                          <Archive size={15} />
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(notice.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Delete Notice"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Message Body */}
                <p className="text-xs text-slate-300 mt-3 leading-relaxed whitespace-pre-line line-clamp-3">
                  {notice.content || notice.message}
                </p>

                {/* Attachment banner if present */}
                {notice.attachment_url && (
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-indigo-300">
                      <Paperclip size={14} />
                      <span className="font-medium">Attached Document / Policy Resource</span>
                    </div>
                    <a
                      href={notice.attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-[11px] font-semibold flex items-center gap-1 transition-all"
                    >
                      <span>Download / View</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                )}

                {/* Footer status & Actions */}
                <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="font-medium text-slate-300">
                      {notice.author?.name || 'Executive Leadership'}
                    </span>
                    <span>•</span>
                    <span>Published {formatDate(notice.published_at)}</span>
                  </div>

                  {/* Read / Acknowledgement status */}
                  <div className="flex items-center gap-3">
                    {/* Read receipt indicator */}
                    {notice.is_read ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                        <Check size={12} className="text-emerald-400" />
                        <span>Read</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleMarkAsRead(notice.id)}
                        className="text-[11px] text-slate-400 hover:text-slate-200 underline"
                      >
                        Mark as read
                      </button>
                    )}

                    {/* Acknowledgement requirement & signoff */}
                    {notice.requires_acknowledgement && (
                      <div>
                        {notice.is_acknowledged ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                            <CheckCircle2 size={13} />
                            <span>Acknowledged</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAcknowledge(notice.id)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1 transition-all"
                          >
                            <ShieldCheck size={13} />
                            <span>Acknowledge Notice</span>
                          </button>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => openNoticeDetail(notice)}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                    >
                      View Notice
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT NOTICE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl p-6 shadow-2xl animate-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">
                {editingNotice ? 'Edit Company Notice' : 'Broadcast Company Notice'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white text-xl">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveNotice} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Headline / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 All-Hands Meeting & Strategy"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="general">General</option>
                    <option value="celebration">Celebration &amp; Wins</option>
                    <option value="policy">Policy Update</option>
                    <option value="event">Company Event</option>
                    <option value="urgent">Urgent Operational</option>
                    <option value="compliance">Compliance &amp; Legal</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Priority Level</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as NoticePriority)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Publication Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as PublicationStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="published">Published (Live)</option>
                    <option value="draft">Save as Draft (Admins Only)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Target Department</label>
                  <select
                    value={targetDept}
                    onChange={(e) => setTargetDept(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">Entire Company (All)</option>
                    <option value="Sales">Sales Team</option>
                    <option value="Engineering">Engineering Team</option>
                    <option value="Marketing">Marketing Team</option>
                    <option value="Operations">Operations Team</option>
                    <option value="Executive">Executive Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Published Timestamp / Schedule
                  </label>
                  <input
                    type="datetime-local"
                    value={publishedAt}
                    onChange={(e) => setPublishedAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Setting a future date schedules the notice automatically.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Expiry Date (Optional)</label>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Notice will automatically mark as expired after this date.
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Attachment URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://documents.vingo.com/sample-handout.pdf"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-6 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ack-toggle"
                    checked={requiresAck}
                    onChange={(e) => setRequiresAck(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                  />
                  <label htmlFor="ack-toggle" className="text-xs font-semibold text-slate-300 cursor-pointer">
                    Require Employee Sign-Off / Acknowledgement
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="pin-toggle"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                  />
                  <label htmlFor="pin-toggle" className="text-xs font-semibold text-slate-300 cursor-pointer">
                    Pin to Top
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Notice Message / Content *</label>
                <textarea
                  rows={5}
                  required
                  placeholder="Write clear, comprehensive announcement details..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
                >
                  {editingNotice ? 'Save Changes' : status === 'draft' ? 'Save as Draft' : 'Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NOTICE AUDIT MODAL (ADMIN ONLY) */}
      {auditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl p-6 shadow-2xl animate-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="text-indigo-400" size={18} />
                  <span>Notice Audit &amp; Receipt Log</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verification tracking of read status and mandatory sign-offs for all active employees.
                </p>
              </div>
              <button onClick={() => setAuditModalOpen(false)} className="text-slate-400 hover:text-white text-xl">
                &times;
              </button>
            </div>

            {auditLoading || !auditData ? (
              <div className="p-12 text-center text-slate-400">Loading audit receipts...</div>
            ) : (
              <div className="mt-4 space-y-6">
                {/* Notice summary */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-indigo-400">{auditData.notice.category}</span>
                  <h4 className="text-sm font-bold text-white mt-1">{auditData.notice.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Published: {formatDateTime(auditData.notice.published_at)} • Target: {auditData.notice.target_department}
                  </p>
                </div>

                {/* Progress KPI Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">Read Receipts</span>
                      <span className="text-sm font-extrabold text-white">{auditData.readRate}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${auditData.readRate}%` }} />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1.5 block">
                      {auditData.reads.length} of {auditData.totalEligible} employees viewed
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">Acknowledgements</span>
                      <span className="text-sm font-extrabold text-white">{auditData.ackRate}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${auditData.ackRate}%` }} />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1.5 block">
                      {auditData.acknowledgements.length} of {auditData.totalEligible} signed
                    </span>
                  </div>
                </div>

                {/* Breakdown List */}
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Employee Status Breakdown
                  </h4>
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {/* Combine read and acknowledged users */}
                    {auditData.reads.map((r) => {
                      const ack = auditData.acknowledgements.find((a) => a.user.id === r.user.id);
                      return (
                        <div
                          key={r.user.id}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={r.user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover border border-slate-700"
                            />
                            <div>
                              <p className="font-semibold text-white">{r.user.name}</p>
                              <p className="text-[11px] text-slate-400">
                                {r.user.department} • Read: {formatDateTime(r.read_at)}
                              </p>
                            </div>
                          </div>

                          <div>
                            {ack ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                                <CheckCircle2 size={12} />
                                <span>Signed: {formatDateTime(ack.acknowledged_at)}</span>
                              </span>
                            ) : auditData.notice.requires_acknowledgement ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                                <Clock size={12} />
                                <span>Awaiting Sign-off</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Read Confirmed</span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {auditData.pendingEmployees.map((emp) => (
                      <div
                        key={emp.id}
                        className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-center justify-between text-xs opacity-75"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={emp.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover border border-slate-800"
                          />
                          <div>
                            <p className="font-semibold text-slate-300">{emp.name}</p>
                            <p className="text-[11px] text-slate-500">{emp.department} • {emp.email}</p>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                          <Clock size={12} />
                          <span>Unread</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setAuditModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                  >
                    Close Log
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NOTICE FULL DETAIL MODAL */}
      {viewNotice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl p-6 shadow-2xl animate-in zoom-in-95 my-8">
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                  {viewNotice.category}
                </span>
                <h3 className="text-lg font-bold text-white mt-1">{viewNotice.title}</h3>
                <p className="text-[11px] text-slate-400">
                  Published {formatDateTime(viewNotice.published_at)} by {viewNotice.author?.name || 'Leadership'}
                </p>
              </div>
              <button onClick={() => setViewNotice(null)} className="text-slate-400 hover:text-white text-xl">
                &times;
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                {viewNotice.content || viewNotice.message}
              </div>

              {viewNotice.attachment_url && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-indigo-300">
                    <Paperclip size={14} />
                    <span>Official Document Attachment</span>
                  </div>
                  <a
                    href={viewNotice.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1"
                  >
                    <span>Download</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {/* Acknowledgement section */}
              {viewNotice.requires_acknowledgement && (
                <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-white">Mandatory Read &amp; Compliance Sign-off</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Your acknowledgment is recorded with a verified timestamp.
                    </p>
                  </div>

                  {viewNotice.is_acknowledged ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                      <CheckCircle2 size={14} />
                      <span>Acknowledged</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAcknowledge(viewNotice.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                    >
                      <ShieldCheck size={14} />
                      <span>Sign &amp; Acknowledge</span>
                    </button>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-slate-800">
                <button
                  onClick={() => setViewNotice(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
