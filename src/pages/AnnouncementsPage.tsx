import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { crmService } from '../services/crmService';
import { Announcement } from '../types/database';
import { formatDate } from '../lib/utils';
import {
  Megaphone,
  Pin,
  Plus,
  Trash2,
  Sparkles,
  AlertTriangle,
  Calendar,
  Layers
} from 'lucide-react';

export const AnnouncementsPage: React.FC = () => {
  const { user, isAdmin, showToast } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'general' | 'urgent' | 'celebration' | 'policy' | 'event'>('general');
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [isPinned, setIsPinned] = useState(false);
  const [targetDept, setTargetDept] = useState('all');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await crmService.getAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      showToast('Title and content are required', 'error');
      return;
    }

    try {
      await crmService.createAnnouncement({
        title: title.trim(),
        content: content.trim(),
        category,
        priority,
        is_pinned: isPinned,
        target_department: targetDept,
        created_by: user?.id || 'admin-001'
      });

      showToast('Announcement broadcasted successfully!', 'success');
      setCreateOpen(false);
      setTitle('');
      setContent('');
      setIsPinned(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to post announcement', 'error');
    }
  };

  const handleTogglePin = async (id: string) => {
    try {
      const newPin = await crmService.togglePinAnnouncement(id);
      showToast(newPin ? 'Announcement pinned to top' : 'Announcement unpinned', 'info');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to pin', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await crmService.deleteAnnouncement(id);
      showToast('Announcement removed', 'info');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Company Announcements</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Internal company broadcasts, executive updates, all-hands schedules, and team milestones.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all w-fit"
          >
            <Plus size={16} />
            <span>Broadcast Announcement</span>
          </button>
        )}
      </div>

      {/* Announcements Stream */}
      <div className="space-y-4">
        {announcements.map((ann) => (
          <div
            key={ann.id}
            className={`p-6 rounded-2xl bg-slate-900/60 border transition-all ${
              ann.is_pinned
                ? 'border-indigo-500/50 shadow-indigo-500/10 shadow-xl'
                : 'border-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {ann.is_pinned && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      <Pin size={11} className="rotate-45" />
                      <span>PINNED</span>
                    </span>
                  )}

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      ann.priority === 'urgent'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : ann.priority === 'important'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {ann.priority}
                  </span>

                  <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                    {ann.category}
                  </span>

                  <span className="text-[10px] text-slate-400">
                    Target: {ann.target_department === 'all' ? 'All Staff' : `${ann.target_department} Dept`}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white pt-1">{ann.title}</h3>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleTogglePin(ann.id)}
                    className={`p-1.5 rounded-lg text-xs transition-colors ${
                      ann.is_pinned
                        ? 'text-indigo-400 bg-indigo-500/10'
                        : 'text-slate-500 hover:text-white'
                    }`}
                    title={ann.is_pinned ? 'Unpin' : 'Pin to top'}
                  >
                    <Pin size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(ann.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed whitespace-pre-line">
              {ann.content}
            </p>

            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
              <span>Author: {ann.author?.name || 'Company Leadership'} ({ann.author?.title || 'Executive'})</span>
              <span>{formatDate(ann.created_at)}</span>
            </div>
          </div>
        ))}

        {announcements.length === 0 && (
          <div className="p-12 text-center text-slate-500 bg-slate-900/40 border border-slate-800 rounded-2xl">
            No announcements broadcasted yet.
          </div>
        )}
      </div>

      {/* CREATE ANNOUNCEMENT MODAL */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Broadcast Announcement</h3>
              <button onClick={() => setCreateOpen(false)} className="text-slate-400 hover:text-white text-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Headline / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 All-Hands Meeting & Strategy"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="general">General</option>
                    <option value="celebration">Celebration & Wins</option>
                    <option value="policy">Policy Update</option>
                    <option value="event">Company Event</option>
                    <option value="urgent">Urgent Alert</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Target Audience</label>
                  <select
                    value={targetDept}
                    onChange={(e) => setTargetDept(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="all">Entire Company (All)</option>
                    <option value="sales">Sales Team Only</option>
                    <option value="engineering">Engineering Team Only</option>
                    <option value="marketing">Marketing Team Only</option>
                    <option value="operations">Operations Team Only</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="pin-toggle"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                  />
                  <label htmlFor="pin-toggle" className="text-xs font-semibold text-slate-300 cursor-pointer">
                    Pin Announcement to Top
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Content / Message *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write announcement details..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
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
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
