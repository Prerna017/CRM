import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../context/AuthContext';
import { Info, X } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dismissBanner, setDismissBanner] = useState(false);
  const { isSupabaseConfigured } = useAuth();

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      {/* Sidebar navigation */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

        {/* Informative Supabase configuration guidance banner */}
        {!isSupabaseConfigured && !dismissBanner && (
          <div className="bg-indigo-950/60 border-b border-indigo-800/40 px-6 py-2.5 flex items-center justify-between text-xs text-indigo-200">
            <div className="flex items-center gap-2">
              <Info size={15} className="text-indigo-400 flex-shrink-0" />
              <span>
                <strong>PostgreSQL / Supabase Mode:</strong> Running with pre-seeded company dataset (11–50 employees). All forms, clock-in, leave approvals, and lead pipelines persist interactively. To bind your cloud PostgreSQL instance, add <code className="bg-indigo-900/80 px-1 py-0.5 rounded text-indigo-300">VITE_SUPABASE_URL</code> &amp; <code className="bg-indigo-900/80 px-1 py-0.5 rounded text-indigo-300">VITE_SUPABASE_ANON_KEY</code> to <code className="text-indigo-300">.env</code>.
              </span>
            </div>
            <button
              onClick={() => setDismissBanner(true)}
              className="text-indigo-400 hover:text-white p-1"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}
    </div>
  );
};
