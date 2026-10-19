import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { crmService } from '../services/crmService';
import { Lead, UserProfile, AttendanceRecord, LeaveRecord } from '../types/database';
import { formatCurrency } from '../lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Award,
  Users,
  Clock,
  Target,
  Sparkles
} from 'lucide-react';

const COLORS = ['#6366F1', '#38BDF8', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];

export const ReportsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true);
        const [lData, emps, att, lv] = await Promise.all([
          crmService.getLeads(),
          crmService.getEmployees(),
          crmService.getAdminAttendance(),
          crmService.getAllLeaves()
        ]);
        setLeads(lData);
        setEmployees(emps);
        setAttendance(att);
        setLeaves(lv);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadReports();
  }, []);

  // 1. Pipeline Value by Stage
  const stages = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
  const stageData = stages.map((st) => {
    const matched = leads.filter((l) => l.stage === st);
    return {
      stage: st.toUpperCase(),
      value: matched.reduce((acc, l) => acc + (l.value || 0), 0),
      count: matched.length
    };
  });

  // 2. Sales Rep Leaderboard
  const repData = employees
    .filter((e) => e.role === 'employee')
    .map((e) => {
      const myLeads = leads.filter((l) => l.assigned_to === e.id);
      const wonDeals = myLeads.filter((l) => l.stage === 'won');
      const wonRevenue = wonDeals.reduce((sum, l) => sum + (l.value || 0), 0);
      const pipeline = myLeads.reduce((sum, l) => sum + (l.value || 0), 0);
      return {
        name: e.name,
        department: e.department,
        totalLeads: myLeads.length,
        wonDeals: wonDeals.length,
        wonRevenue,
        pipeline
      };
    })
    .sort((a, b) => b.wonRevenue - a.wonRevenue);

  // 3. Leads by Source Distribution
  const sources = ['website', 'referral', 'linkedin', 'cold_outreach', 'inbound'];
  const sourceData = sources.map((src) => {
    const matched = leads.filter((l) => l.source === src);
    return {
      name: src.replace('_', ' ').toUpperCase(),
      value: matched.reduce((sum, l) => sum + (l.value || 0), 0),
      count: matched.length
    };
  });

  // Overall calculations
  const totalPipeline = leads.reduce((acc, l) => acc + (l.value || 0), 0);
  const totalWonRevenue = leads
    .filter((l) => l.stage === 'won')
    .reduce((acc, l) => acc + (l.value || 0), 0);
  const wonCount = leads.filter((l) => l.stage === 'won').length;
  const winRate = leads.length > 0 ? Math.round((wonCount / leads.length) * 100) : 0;

  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
        <h3 className="text-lg font-bold text-white">Access Restricted</h3>
        <p className="text-xs text-slate-400 mt-1">Founder / Admin credentials are required to view executive reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Executive Performance &amp; Reports</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          High-level revenue metrics, conversion win rates, sales rep performance, and attendance analytics.
        </p>
      </div>

      {/* Top Level Metric Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Pipeline</span>
          <h3 className="text-2xl font-extrabold text-white mt-2">{formatCurrency(totalPipeline)}</h3>
          <p className="text-xs text-slate-400 mt-1">{leads.length} Active &amp; Closed Deals</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Closed Revenue (Won)</span>
          <h3 className="text-2xl font-extrabold text-emerald-400 mt-2">{formatCurrency(totalWonRevenue)}</h3>
          <p className="text-xs text-slate-400 mt-1">{wonCount} Successfully Closed Contracts</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pipeline Win Rate</span>
          <h3 className="text-2xl font-extrabold text-indigo-400 mt-2">{winRate}%</h3>
          <p className="text-xs text-slate-400 mt-1">From Lead Creation to Contract Execution</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Average Deal Size</span>
          <h3 className="text-2xl font-extrabold text-cyan-400 mt-2">
            {formatCurrency(leads.length > 0 ? Math.round(totalPipeline / leads.length) : 0)}
          </h3>
          <p className="text-xs text-slate-400 mt-1">Across all pipeline stages</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deal Value by Stage BarChart */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-1">Deal Value by Pipeline Stage ($)</h3>
          <p className="text-xs text-slate-400 mb-6">Capital distribution across active sales steps.</p>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="stage" stroke="#64748b" fontSize={11} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(val) => `$${val / 1000}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Value']}
                />
                <Bar dataKey="value" fill="#6366F1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Source Distribution PieChart */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-1">Pipeline Acquisition Channels</h3>
          <p className="text-xs text-slate-400 mb-6">Deal value distribution categorized by lead source.</p>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  dataKey="value"
                  label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Value']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sales Leaderboard Table */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <Award size={16} className="text-amber-400" />
          <span>Team Sales Leaderboard &amp; Conversions</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Individual sales representative performance, deals closed, and total revenue contributed.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3">Sales Representative</th>
                <th className="p-3">Department</th>
                <th className="p-3">Assigned Deals</th>
                <th className="p-3">Deals Won</th>
                <th className="p-3">Closed Won Revenue</th>
                <th className="p-3">Total Pipeline Managed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {repData.map((rep, idx) => (
                <tr key={rep.name} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold">
                      {idx + 1}
                    </span>
                    <span>{rep.name}</span>
                  </td>
                  <td className="p-3 text-slate-400">{rep.department}</td>
                  <td className="p-3 text-slate-300">{rep.totalLeads}</td>
                  <td className="p-3 font-bold text-emerald-400">{rep.wonDeals}</td>
                  <td className="p-3 font-extrabold text-emerald-400">{formatCurrency(rep.wonRevenue)}</td>
                  <td className="p-3 font-semibold text-slate-300">{formatCurrency(rep.pipeline)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
