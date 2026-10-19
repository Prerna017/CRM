import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Sparkles,
  Lock,
  Mail
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, demoSwitch, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      await login(email, password);
      navigate('/');
    } catch {
      // Error handled in context
    }
  };

  const handleQuickDemo = async (demoEmail: string) => {
    await demoSwitch(demoEmail);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Brand Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white shadow-xl shadow-indigo-600/30 mb-2">
            <Briefcase size={28} />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">VINGO ENTERPRISE</h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Internal Employee Management, Live Attendance, Leave Approvals &amp; Sales Pipeline Platform.
          </p>
        </div>

        {/* Demo Fast-Login Cards */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-indigo-500/30 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Sparkles size={13} />
              <span>Instant One-Click Demo Access</span>
            </span>
            <span className="text-[10px] text-slate-500">Pick a role</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleQuickDemo('founder@vingo.com')}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/60 text-left transition-all hover:bg-slate-900 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">👑 Founder</span>
                <ShieldCheck size={14} className="text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Prerna Sharma</p>
              <span className="text-[9px] text-indigo-300 font-semibold uppercase mt-1 block">Full Control</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('alex@vingo.com')}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/60 text-left transition-all hover:bg-slate-900 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">💼 Sales Lead</span>
                <UserCheck size={14} className="text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Alex Morgan</p>
              <span className="text-[9px] text-emerald-300 font-semibold uppercase mt-1 block">Sales &amp; Leads</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('sarah@vingo.com')}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/60 text-left transition-all hover:bg-slate-900 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">💻 Tech Lead</span>
                <UserCheck size={14} className="text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Sarah Jenkins</p>
              <span className="text-[9px] text-cyan-300 font-semibold uppercase mt-1 block">Engineering</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('rahul@vingo.com')}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/60 text-left transition-all hover:bg-slate-900 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">📈 Marketing</span>
                <UserCheck size={14} className="text-amber-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Rahul Verma</p>
              <span className="text-[9px] text-amber-300 font-semibold uppercase mt-1 block">Growth &amp; Comms</span>
            </button>
          </div>
        </div>

        {/* Manual Credentials Form */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
          <div className="text-left">
            <h2 className="text-sm font-bold text-white">Or Sign in with Credentials</h2>
            <p className="text-[11px] text-slate-400">Enter your official company email and password.</p>
          </div>

          <form onSubmit={handleManualLogin} className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Company Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="founder@vingo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all mt-2"
            >
              <span>Authenticate Portal</span>
              <ArrowRight size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
