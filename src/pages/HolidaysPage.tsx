import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { crmService } from '../services/crmService';
import { CompanyHoliday, LeaveRecord, CompanySettings } from '../types/database';
import { formatDate } from '../lib/utils';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Edit2,
  Archive,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Briefcase,
  AlertCircle,
  Eye,
  Layers,
  Plane
} from 'lucide-react';

export const HolidaysPage: React.FC = () => {
  const { user, isAdmin, showToast } = useAuth();
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  // View mode
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly' | 'list'>('monthly');
  const [showArchived, setShowArchived] = useState(false);

  // Calendar Navigation
  const [currentDate, setCurrentDate] = useState(new Date('2026-10-19T00:00:00Z'));

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<CompanyHoliday | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [isMandatory, setIsMandatory] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [hols, sett] = await Promise.all([
        crmService.getHolidays(showArchived),
        crmService.getSettings()
      ]);
      setHolidays(hols);
      setSettings(sett);

      if (isAdmin) {
        const allLeaves = await crmService.getAllLeaves();
        setLeaves(allLeaves.filter((l) => l.status === 'approved'));
      } else {
        const myLeaves = await crmService.getMyLeaves(user?.id || '');
        setLeaves(myLeaves.filter((l) => l.status === 'approved'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [showArchived, isAdmin, user]);

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
        is_mandatory: isMandatory,
        is_archived: false
      }, user?.id);

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

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHoliday || !title.trim() || !date) return;

    try {
      await crmService.updateHoliday(selectedHoliday.id, {
        title: title.trim(),
        date,
        description: description.trim() || undefined,
        is_mandatory: isMandatory
      }, user?.id);

      showToast('Holiday updated successfully', 'success');
      setEditOpen(false);
      setSelectedHoliday(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update holiday', 'error');
    }
  };

  const handleArchiveToggle = async (h: CompanyHoliday) => {
    const action = h.is_archived ? 'unarchive' : 'archive';
    if (!window.confirm(`Are you sure you want to ${action} "${h.title}"?`)) return;

    try {
      if (h.is_archived) {
        await crmService.updateHoliday(h.id, { is_archived: false }, user?.id);
        showToast('Holiday unarchived', 'info');
      } else {
        await crmService.archiveHoliday(h.id, user?.id);
        showToast('Holiday archived from active company schedule', 'info');
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Permanently remove this holiday from company calendar?')) return;
    try {
      await crmService.deleteHoliday(id, user?.id);
      showToast('Holiday deleted', 'info');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete', 'error');
    }
  };

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weeklyOffDays = settings?.weekly_offs || ['Saturday', 'Sunday'];

  const getCalendarDays = () => {
    const cells = [];
    // Padding for previous month days
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ day: null, dateStr: null, isWeeklyOff: false });
    }
    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;
      const isWeeklyOff = weeklyOffDays.includes(dayName);

      cells.push({
        day: d,
        dateStr,
        isWeeklyOff,
        isToday: dateStr === '2026-10-19'
      });
    }
    return cells;
  };

  const calendarDays = getCalendarDays();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Corporate Calendar & Holidays</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {holidays.length} Company Holidays
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Paid non-working company holidays, weekly offs ({weeklyOffDays.join(' & ')}), and approved team leaves.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => {
                setTitle('');
                setDate('');
                setDescription('');
                setIsMandatory(true);
                setCreateOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all w-fit"
            >
              <Plus size={16} />
              <span>Add Holiday</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation and View Mode Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        {/* View mode toggle */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'monthly'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Monthly Calendar
          </button>
          <button
            onClick={() => setViewMode('yearly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'yearly'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Yearly Overview
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'list'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Holiday List & Archive
          </button>
        </div>

        {/* Month Navigation (Monthly mode) */}
        {viewMode === 'monthly' && (
          <div className="flex items-center gap-3">
            <button
              onClick={prevMonth}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-bold text-white min-w-[140px] text-center">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 text-indigo-400">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            Company Holiday
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
            Weekly Off
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            Approved Leave
          </span>
        </div>
      </div>

      {/* MONTHLY CALENDAR VIEW */}
      {viewMode === 'monthly' && (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-xl">
          {/* Days of week header */}
          <div className="grid grid-cols-7 bg-slate-950 border-b border-slate-800 text-center text-xs font-bold text-slate-400 py-3">
            <span>SUN</span>
            <span>MON</span>
            <span>TUE</span>
            <span>WED</span>
            <span>THU</span>
            <span>FRI</span>
            <span>SAT</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-800/60">
            {calendarDays.map((cell, idx) => {
              if (!cell.day || !cell.dateStr) {
                return <div key={`empty-${idx}`} className="min-h-[105px] bg-slate-950/40 p-2" />;
              }

              const dayHolidays = holidays.filter((h) => h.date === cell.dateStr);
              const dayLeaves = leaves.filter(
                (l) => l.start_date <= cell.dateStr! && l.end_date >= cell.dateStr!
              );

              return (
                <div
                  key={cell.dateStr}
                  className={`min-h-[110px] p-2 flex flex-col justify-between transition-colors ${
                    cell.isToday
                      ? 'bg-indigo-950/20 ring-1 ring-inset ring-indigo-500/50'
                      : cell.isWeeklyOff
                      ? 'bg-slate-950/50'
                      : 'bg-slate-900/40 hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded ${
                        cell.isToday
                          ? 'bg-indigo-600 text-white'
                          : cell.isWeeklyOff
                          ? 'text-slate-500'
                          : 'text-slate-300'
                      }`}
                    >
                      {cell.day}
                    </span>
                    {cell.isWeeklyOff && (
                      <span className="text-[9px] uppercase font-semibold text-slate-500">
                        Off
                      </span>
                    )}
                  </div>

                  {/* Day Events Container */}
                  <div className="space-y-1 my-1">
                    {/* Holidays */}
                    {dayHolidays.map((h) => (
                      <div
                        key={h.id}
                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 truncate"
                        title={`${h.title} ${h.description ? '— ' + h.description : ''}`}
                      >
                        🎉 {h.title}
                      </div>
                    ))}

                    {/* Approved Leaves */}
                    {dayLeaves.map((l) => (
                      <div
                        key={l.id}
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 truncate"
                        title={`${l.profile?.name || 'You'}: ${l.leave_type.toUpperCase()} Leave`}
                      >
                        ✈️ {l.profile?.name || 'You'} ({l.leave_type})
                      </div>
                    ))}
                  </div>

                  <div className="text-[9px] text-slate-600 text-right">
                    {dayHolidays.length + dayLeaves.length > 0
                      ? `${dayHolidays.length + dayLeaves.length} event(s)`
                      : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* YEARLY OVERVIEW */}
      {viewMode === 'yearly' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {monthNames.map((mName, mIdx) => {
            const mMonthStr = String(mIdx + 1).padStart(2, '0');
            const mHolidays = holidays.filter((h) => h.date.startsWith(`${year}-${mMonthStr}`));

            return (
              <div
                key={mName}
                onClick={() => {
                  setCurrentDate(new Date(year, mIdx, 1));
                  setViewMode('monthly');
                }}
                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all shadow-md group"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                    {mName}
                  </h3>
                  <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded">
                    {mHolidays.length} holiday(s)
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 min-h-[90px]">
                  {mHolidays.length === 0 ? (
                    <span className="text-xs text-slate-600 italic block py-4 text-center">
                      Standard weekly offs only
                    </span>
                  ) : (
                    mHolidays.map((h) => (
                      <div key={h.id} className="text-xs flex items-center justify-between text-slate-300">
                        <span className="truncate pr-2 font-medium">{h.title}</span>
                        <span className="text-[10px] text-slate-500 font-mono shrink-0">
                          {h.date.slice(-2)} {mName.slice(0, 3)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIST & ARCHIVE MANAGEMENT VIEW */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <span className="text-slate-300">
                Show archived / previous fiscal holidays in management view:
              </span>
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`px-3 py-1 rounded-lg font-semibold text-xs transition-all ${
                  showArchived ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {showArchived ? 'Showing Archived (Active)' : 'Archived Hidden'}
              </button>
            </div>
          )}

          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Holiday Date</th>
                  <th className="px-5 py-3.5">Title & Observance</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5">Status</th>
                  {isAdmin && <th className="px-5 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {holidays.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4 font-mono font-medium text-white whitespace-nowrap">
                      {formatDate(h.date)}
                    </td>
                    <td className="px-5 py-4 font-bold text-white whitespace-nowrap">
                      🎉 {h.title}
                    </td>
                    <td className="px-5 py-4 text-slate-400">
                      {h.description || 'Mandatory company-wide non-working observance.'}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          h.is_archived
                            ? 'bg-slate-800 text-slate-400 border border-slate-700'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                        }`}
                      >
                        {h.is_archived ? 'Archived' : 'Active'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedHoliday(h);
                              setTitle(h.title);
                              setDate(h.date);
                              setDescription(h.description || '');
                              setIsMandatory(h.is_mandatory);
                              setEditOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                            title="Edit holiday"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            onClick={() => handleArchiveToggle(h)}
                            className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300"
                            title={h.is_archived ? 'Unarchive holiday' : 'Archive holiday'}
                          >
                            <Archive size={13} />
                          </button>

                          <button
                            onClick={() => handleDelete(h.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                            title="Delete holiday"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD HOLIDAY MODAL */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Add Company Holiday</h3>
              <button onClick={() => setCreateOpen(false)} className="text-slate-400 hover:text-white text-xl">
                &times;
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Holiday Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. Founder Day Celebration"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Date *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Official details about non-working coverage or holiday payroll..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
                >
                  Save Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT HOLIDAY MODAL */}
      {editOpen && selectedHoliday && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Edit Company Holiday</h3>
              <button onClick={() => setEditOpen(false)} className="text-slate-400 hover:text-white text-xl">
                &times;
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Holiday Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Date *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
                >
                  Update Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
