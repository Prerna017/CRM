import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { crmService } from '../services/crmService';
import { CompanyHoliday } from '../types/database';
import { formatDate } from '../lib/utils';
import {
  Calendar,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  Clock
} from 'lucide-react';

export const HolidaysPage: React.FC = () => {
  const { isAdmin, showToast } = useAuth();
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [loading, setLoading] = useState(true);

  // Add modal
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await crmService.getHolidays();
      setHolidays(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) {
      showToast('Title and Date are required', 'error');
      return;
    }

    try {
      await crmService.addHoliday({
        title: title.trim(),
        date,
        description: description.trim() || undefined,
        is_mandatory: true
      });

      showToast('Company holiday added successfully', 'success');
      setCreateOpen(false);
      setTitle('');
      setDate('');
      setDescription('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to add holiday', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this holiday from company calendar?')) return;
    try {
      await crmService.deleteHoliday(id);
      showToast('Holiday removed', 'info');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete', 'error');
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Corporate Holiday Calendar</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Official paid non-working company holidays, federal observances, and winter break schedule.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all w-fit"
          >
            <Plus size={16} />
            <span>Add Holiday</span>
          </button>
        )}
      </div>

      {/* Holidays List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {holidays.map((h) => {
          const isPast = h.date < today;
          const isUpcoming = h.date >= today;

          return (
            <div
              key={h.id}
              className={`p-5 rounded-2xl bg-slate-900/60 border transition-all shadow-md flex flex-col justify-between ${
                isUpcoming
                  ? 'border-indigo-500/30 hover:border-indigo-500/60'
                  : 'border-slate-800 opacity-70'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs font-bold">
                    <Calendar size={14} />
                    <span>{formatDate(h.date)}</span>
                  </div>
                  {isUpcoming ? (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                      Upcoming
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      Past
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-white mt-3">{h.title}</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {h.description || 'Official paid company holiday. Offices are closed.'}
                </p>
              </div>

              {isAdmin && (
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400">Paid Holiday</span>
                  <button
                    onClick={() => handleDelete(h.id)}
                    className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors"
                    title="Remove holiday"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ADD HOLIDAY MODAL */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Add Company Holiday</h3>
              <button onClick={() => setCreateOpen(false)} className="text-slate-400 hover:text-white text-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Holiday Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali Holiday"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Description / Notes</label>
                <input
                  type="text"
                  placeholder="Optional details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                  Add to Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
