import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');

  const isDeactivated = reason === 'deactivated';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 text-center relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full space-y-6 p-8 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center ring-8 ring-rose-500/5">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold tracking-widest uppercase text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
            {isDeactivated ? 'Account Deactivated' : '401 • Unauthorized Session'}
          </span>
          <h1 className="text-2xl font-bold font-heading text-slate-100">
            {isDeactivated ? 'Account Access Suspended' : 'Authentication Required'}
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isDeactivated
              ? 'Your company account has been deactivated by an administrator. You no longer have access to internal systems and protected company records.'
              : 'Your active session has expired or you do not have permission to access this internal workspace. Please log in with your verified credentials.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Sign in to Portal
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
