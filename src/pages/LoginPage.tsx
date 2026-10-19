import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Sparkles,
  Lock,
  Mail,
  AlertCircle,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/forms/FormField';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth, PortalLoginType } from '@/context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, demoSwitch, resetPassword, loading } = useAuth();
  const navigate = useNavigate();

  // Active portal tab: 'employee' or 'admin'
  const [portalType, setPortalType] = useState<PortalLoginType>('employee');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Forgot password modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!email) return;

    try {
      await login(email, password, portalType);
      navigate('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setAuthError(msg);
    }
  };

  const handleQuickDemo = async (demoEmail: string, intendedPortal: PortalLoginType) => {
    setAuthError(null);
    try {
      setPortalType(intendedPortal);
      await demoSwitch(demoEmail, intendedPortal);
      navigate('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Demo switch failed';
      setAuthError(msg);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    if (!forgotEmail) return;

    setForgotLoading(true);
    try {
      const result = await resetPassword(forgotEmail);
      setForgotSuccess(result.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset email';
      setForgotError(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white shadow-xl shadow-indigo-600/30 mb-1">
            <Briefcase className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight font-heading">
            VINGO ENTERPRISE
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Internal Employee Workforce, Attendance &amp; CRM Pipeline
          </p>
        </div>

        {/* Dual Portal Selection Tabs */}
        <div className="p-1 rounded-2xl bg-slate-900/90 border border-slate-800 grid grid-cols-2 gap-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              setPortalType('employee');
              setAuthError(null);
            }}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold transition-all duration-200 ${
              portalType === 'employee'
                ? 'bg-gradient-to-r from-emerald-600/30 to-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <UserCheck className="h-4 w-4 text-emerald-400" />
            <span>Employee Login</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPortalType('admin');
              setAuthError(null);
            }}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold transition-all duration-200 ${
              portalType === 'admin'
                ? 'bg-gradient-to-r from-indigo-600/30 to-purple-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-indigo-400" />
            <span>Founder / Admin Login</span>
          </button>
        </div>

        {/* Portal Notice */}
        <div className="text-center">
          <span className="text-[11px] text-slate-400">
            {portalType === 'admin'
              ? '👑 Access restricted to Founder & HR Administrators (verified via DB role).'
              : '💼 For Team Members, Sales Executives, Engineers, and Staff.'}
          </span>
        </div>

        {/* Error Feedback Banner */}
        {authError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}

        {/* Manual Credentials Form */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md space-y-4">
          <form onSubmit={handleManualLogin} className="space-y-4">
            <FormField label="Official Company Email" required>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  type="email"
                  required
                  placeholder={
                    portalType === 'admin' ? 'founder@vingo.com' : 'employee@vingo.com'
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </FormField>

            <FormField label="Password" required>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </FormField>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-500 text-[11px]">Default demo password: password123</span>
              <button
                type="button"
                onClick={() => {
                  setForgotOpen(true);
                  setForgotError(null);
                  setForgotSuccess(null);
                  setForgotEmail(email);
                }}
                className="text-indigo-400 hover:text-indigo-300 underline-offset-4 hover:underline font-medium"
              >
                Forgot Password?
              </button>
            </div>

            <Button
              type="submit"
              isLoading={loading}
              className={`w-full font-bold shadow-lg mt-2 ${
                portalType === 'admin'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
              }`}
            >
              <span>{portalType === 'admin' ? 'Authenticate Founder Portal' : 'Authenticate Employee Portal'}</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </div>

        {/* Demo Fast-Login Pickers */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span>One-Click Role Demonstration</span>
            </span>
            <span className="text-[10px] text-slate-500">Database Role Verification</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleQuickDemo('founder@vingo.com', 'admin')}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/60 text-left transition-all hover:bg-slate-900 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">👑 Founder/Admin</span>
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Prerna Sharma</p>
              <span className="text-[9px] text-indigo-300 font-semibold uppercase mt-1 block">Role: founder_admin</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('alex@vingo.com', 'employee')}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/60 text-left transition-all hover:bg-slate-900 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">💼 Sales Lead</span>
                <UserCheck className="h-3.5 w-3.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Alex Morgan</p>
              <span className="text-[9px] text-emerald-300 font-semibold uppercase mt-1 block">Role: employee</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('sarah@vingo.com', 'employee')}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/60 text-left transition-all hover:bg-slate-900 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">💻 Tech Lead</span>
                <UserCheck className="h-3.5 w-3.5 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Sarah Jenkins</p>
              <span className="text-[9px] text-cyan-300 font-semibold uppercase mt-1 block">Role: employee</span>
            </button>

            {/* Deactivated Account Demonstration Card */}
            <button
              type="button"
              onClick={() => handleQuickDemo('deactivated@vingo.com', 'employee')}
              className="p-3 rounded-xl bg-slate-950 border border-rose-900/40 hover:border-rose-500/60 text-left transition-all hover:bg-rose-950/20 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-300">🚫 Deactivated</span>
                <AlertCircle className="h-3.5 w-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Marcus Vance</p>
              <span className="text-[9px] text-rose-400 font-semibold uppercase mt-1 block">Status: deactivated</span>
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent onClose={() => setForgotOpen(false)}>
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-1">
              <KeyRound className="h-5 w-5" />
            </div>
            <DialogTitle>Reset Account Password</DialogTitle>
            <DialogDescription>
              Enter your registered corporate email to receive a password reset link.
            </DialogDescription>
          </DialogHeader>

          {forgotSuccess ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-2 mt-4">
              <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto" />
              <p className="text-xs text-center font-medium">{forgotSuccess}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setForgotOpen(false)}
                className="w-full mt-2"
              >
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4 mt-4">
              {forgotError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{forgotError}</span>
                </div>
              )}

              <FormField label="Corporate Email" required>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    type="email"
                    required
                    placeholder="you@vingo.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </FormField>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForgotOpen(false)}
                  disabled={forgotLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={forgotLoading}>
                  Send Reset Link
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginPage;
