import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { crmService } from '../services/crmService';
import { ComprehensiveReportMetrics } from '../types/database';
import { PageContainer } from '../components/layout/PageContainer';
import { formatCurrency } from '../lib/utils';
import {
  Users,
  Clock,
  CalendarDays,
  Target,
  DollarSign,
  TrendingUp,
  Award,
  AlertTriangle,
  Flame,
  Unlock,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  HelpCircle,
  Sparkles,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
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

const STAGE_COLORS: Record<string, string> = {
  New: '#06b6d4',
  Contacted: '#3b82f6',
  Qualified: '#6366f1',
  Proposal: '#a855f7',
  Won: '#10b981',
  Lost: '#f43f5e'
};

const PIE_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export const ReportsPage: React.FC = () => {
  const { user, showToast } = useAuth();
  const [report, setReport] = useState<ComprehensiveReportMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await crmService.getComprehensiveReport(user?.id);
      setReport(data);
    } catch (err: any) {
      console.error('Failed to load comprehensive report:', err);
      showToast('Failed to load report analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [user]);

  const handleExportCsv = () => {
    if (!report) return;
    const lines = [
      '--- VINGO ENTERPRISE CRM COMPREHENSIVE PERFORMANCE REPORT ---',
      `Generated At: ${new Date().toISOString()}`,
      '',
      '1. WORKFORCE METRICS',
      `Total Active Employees,${report.workforce.totalActive}`,
      `Total Inactive Employees,${report.workforce.totalInactive}`,
      `Total Departments,${report.workforce.totalDepartments}`,
      ...report.workforce.departmentDistribution.map((d) => `Dept: ${d.name},${d.count}`),
      '',
      '2. ATTENDANCE SUMMARY TODAY',
      `Expected Employees,${report.attendance.todayTotalExpected}`,
      `Clocked In,${report.attendance.clockedIn}`,
      `Clocked Out,${report.attendance.clockedOut}`,
      `Late Arrivals,${report.attendance.lateArrivals}`,
      `Missing Checkouts,${report.attendance.missingCheckouts}`,
      `On Leave Today,${report.attendance.onLeave}`,
      `Absent Today,${report.attendance.absent}`,
      `Attendance Rate,${report.attendance.attendanceRatePercent}%`,
      `Average Working Hours,${report.attendance.avgWorkingHours}h`,
      '',
      '3. LEAVE STATISTICS',
      `Pending Requests,${report.leaves.pendingCount}`,
      `Approved Requests,${report.leaves.approvedCount}`,
      `Rejected Requests,${report.leaves.rejectedCount}`,
      `Approval Rate,${report.leaves.approvalRatePercent}%`,
      `Total Days Taken,${report.leaves.totalDaysTaken}`,
      ...report.leaves.typeBreakdown.map((t) => `Leave Type: ${t.type},${t.days} days (${t.count} requests)`),
      '',
      '4. PIPELINE & CONVERSION METRICS',
      `Total Leads,${report.pipeline.totalLeads}`,
      `Active Leads,${report.pipeline.activeLeads}`,
      `Dead Leads,${report.pipeline.deadLeads}`,
      `Locked Leads,${report.pipeline.lockedLeads}`,
      `Won Leads,${report.pipeline.wonLeads}`,
      `Lost Leads,${report.pipeline.lostLeads}`,
      `Conversion Rate,${report.pipeline.conversionRatePercent}%`,
      `Total Pipeline Value,$${report.pipeline.totalPipelineValue}`,
      `Won Revenue,$${report.pipeline.wonRevenue}`,
      `Average Won Deal Size,$${report.pipeline.avgWonDealValue}`,
      ...report.pipeline.stageDistribution.map((s) => `Stage: ${s.stage},${s.count} leads ($${s.value})`),
      '',
      '5. SCHEDULED SALES FOLLOW-UPS',
      `Due Today,${report.followups.dueTodayCount}`,
      `Overdue,${report.followups.overdueCount}`,
      `Upcoming,${report.followups.upcomingCount}`,
      `Completed,${report.followups.completedCount}`,
      `Cancelled,${report.followups.cancelledCount}`,
      '',
      '6. SALES REPRESENTATIVE PERFORMANCE LEADERBOARD',
      'Representative,Email,Assigned Leads,Won Deals,Won Revenue,Touchpoints,Win Rate',
      ...report.repPerformance.map(
        (r) =>
          `"${r.repName}","${r.repEmail}",${r.assignedLeadsCount},${r.wonLeadsCount},$${r.wonRevenue},${r.activitiesCount},${r.conversionRatePercent}%`
      )
    ];

    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vingo_executive_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Comprehensive report exported as CSV', 'success');
  };

  if (loading || !report) {
    return (
      <PageContainer title="Executive Analytics & Reports" description="Crunching database figures across all CRM modules...">
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium">Executing database queries and aggregations...</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Executive Analytics & Performance Reports"
      description="Database-derived metrics for workforce attendance, leave statistics, pipeline velocity, and sales representative conversion."
    >
      <div className="space-y-6">
        {/* Action Header & Formula Legend Modal Trigger */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Live Enterprise Telemetry</h3>
              <p className="text-xs text-slate-400">
                Calculated dynamically from real database records with strict audit accountability.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFormulaModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all"
            >
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              Calculation Formulas
            </button>
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export Full Report (CSV)
            </button>
          </div>
        </div>

        {/* 1. Primary Dashboard Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Employees */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Workforce</span>
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                {report.workforce.totalActive}
              </span>
              <span className="text-xs text-emerald-400 font-semibold">Active Staff</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span>{report.workforce.totalDepartments} departments</span>
              <span>{report.workforce.totalInactive} deactivated</span>
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Attendance Today</span>
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                {report.attendance.attendanceRatePercent}%
              </span>
              <span className="text-xs text-slate-400 font-medium">
                ({report.attendance.clockedIn}/{report.attendance.todayTotalExpected})
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span className="text-amber-400 font-medium">{report.attendance.lateArrivals} late</span>
              <span>Avg {report.attendance.avgWorkingHours}h logged</span>
            </div>
          </div>

          {/* Pending Leave Requests */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Leave Requests</span>
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <CalendarDays className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                {report.leaves.pendingCount}
              </span>
              <span className="text-xs text-amber-400 font-semibold">Pending Review</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span>{report.leaves.approvalRatePercent}% approval rate</span>
              <span>{report.leaves.totalDaysTaken} days approved</span>
            </div>
          </div>

          {/* Active Sales Leads */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Deals</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                {report.pipeline.activeLeads}
              </span>
              <span className="text-xs text-slate-400 font-medium">in active pipeline</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span className="text-indigo-300 font-mono font-medium">
                {formatCurrency(report.pipeline.totalPipelineValue)}
              </span>
              <span className="text-emerald-400 font-medium">{report.pipeline.conversionRatePercent}% win rate</span>
            </div>
          </div>
        </div>

        {/* 2. Secondary Indicator Strip: Dead Leads, Locked Leads, Follow-ups Due, Won Revenue */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/60 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase">Dead Leads</p>
              <p className="text-lg font-bold text-white">{report.pipeline.deadLeads}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/60 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Unlock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase">Locked Leads</p>
              <p className="text-lg font-bold text-white">{report.pipeline.lockedLeads}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/60 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase">Follow-ups Due</p>
              <p className="text-lg font-bold text-white">
                {report.followups.dueTodayCount}
                <span className="text-xs text-slate-500 font-normal ml-1">
                  ({report.followups.overdueCount} overdue)
                </span>
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/60 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase">Won Revenue</p>
              <p className="text-lg font-bold text-emerald-400 font-mono">
                {formatCurrency(report.pipeline.wonRevenue)}
              </p>
            </div>
          </div>
        </div>

        {/* 3. Lead Status Distribution Chart & Funnel Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Lead Status Distribution & Stage Velocity
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Total: {report.pipeline.totalLeads} opportunities
              </span>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.pipeline.stageDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="stage" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff', fontWeight: 600 }}
                    formatter={(val: any, name: any) => [
                      name === 'value' ? formatCurrency(val) : val,
                      name === 'value' ? 'Deal Value' : 'Lead Count'
                    ]}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4 pt-4 border-t border-slate-800">
              {report.pipeline.stageDistribution.map((s) => (
                <div key={s.stage} className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                  <p className="text-[10px] font-semibold text-slate-400">{s.stage}</p>
                  <p className="text-sm font-bold text-white mt-0.5">{s.count}</p>
                  <p className="text-[10px] text-slate-500 font-mono truncate">{formatCurrency(s.value)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Department Distribution Pie */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <PieChartIcon className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Department Distribution
                </h3>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={report.workforce.departmentDistribution}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={65}
                      label={({ name, percent }: any) => `${name} (${(((percent as number) || 0) * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {report.workforce.departmentDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-1.5 mt-2">
              {report.workforce.departmentDistribution.map((d, idx) => (
                <div key={d.name} className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                    <span>{d.name}</span>
                  </div>
                  <span className="font-semibold text-white">{d.count} staff</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Sales Representative Activity & Performance Leaderboard */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Sales Representative Performance & Activity Leaderboard
              </h3>
            </div>
            <span className="text-xs text-slate-400">Ranked by Closed Won Revenue</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Representative</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Assigned Leads</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Won Deals</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Won Revenue</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Touchpoints & Emails</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {report.repPerformance.map((rep, idx) => (
                  <tr key={rep.repId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-white">{rep.repName}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{rep.repEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-300">
                      {rep.assignedLeadsCount} leads
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold font-mono">
                        {rep.wonLeadsCount} won
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-white font-mono">
                      {formatCurrency(rep.wonRevenue)}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {rep.activitiesCount} interactions
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, rep.conversionRatePercent)}%` }}
                          />
                        </div>
                        <span className="font-semibold text-slate-200 font-mono">
                          {rep.conversionRatePercent}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Leave Statistics Breakdown */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Leave Statistics & Quota Utilization
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Total Approved Days: {report.leaves.totalDaysTaken}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {report.leaves.typeBreakdown.map((t) => (
              <div key={t.type} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-xs font-semibold text-slate-400">{t.type} Leave</span>
                <p className="text-2xl font-bold text-white mt-1">{t.days} <span className="text-xs font-normal text-slate-400">days</span></p>
                <p className="text-[11px] text-slate-500 mt-1">{t.count} approved submissions</p>
              </div>
            ))}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-xs font-semibold text-slate-400">Decision Rate</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{report.leaves.approvalRatePercent}%</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {report.leaves.approvedCount} approved vs {report.leaves.rejectedCount} rejected
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Calculation Formulas Modal / Drawer */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-400" />
                Metric Calculation Definitions
              </h3>
              <button
                onClick={() => setShowFormulaModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <p className="font-semibold text-indigo-300">Total Active Employees</p>
                <p className="text-slate-400 mt-0.5">
                  Count of profile records with employment status marked as <code className="text-indigo-400">active</code>.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <p className="font-semibold text-cyan-300">Attendance Rate (%)</p>
                <p className="text-slate-400 mt-0.5">
                  <code className="text-cyan-400 font-mono">(Clocked In Today / Total Active Employees) * 100</code>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <p className="font-semibold text-purple-300">Leave Approval Rate (%)</p>
                <p className="text-slate-400 mt-0.5">
                  <code className="text-purple-400 font-mono">(Approved Requests / (Approved + Rejected Requests)) * 100</code>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <p className="font-semibold text-emerald-300">Lead Conversion Rate (%)</p>
                <p className="text-slate-400 mt-0.5">
                  <code className="text-emerald-400 font-mono">(Won Deals / (Won Deals + Lost Deals)) * 100</code>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <p className="font-semibold text-amber-300">Representative Win Rate (%)</p>
                <p className="text-slate-400 mt-0.5">
                  <code className="text-amber-400 font-mono">(Won Deals by Representative / Total Leads Assigned to Rep) * 100</code>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <p className="font-semibold text-slate-200">Total Pipeline Value</p>
                <p className="text-slate-400 mt-0.5">
                  Sum of estimated values for all non-dead leads in active stages (<code className="text-indigo-400">new, contacted, qualified, proposal</code>).
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowFormulaModal(false)}
                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
              >
                Close Dictionary
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default ReportsPage;
