import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile } from '../types/database';
import { INITIAL_PROFILES } from '../services/mockData';
import { crmService } from '../services/crmService';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  login: (email: string, password?: string) => Promise<void>;
  demoSwitch: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  refreshUser: () => Promise<void>;
  isSupabaseConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem('vingo_current_user');
      return stored ? JSON.parse(stored) : INITIAL_PROFILES[0]; // Default to Founder for instant demo preview
    } catch {
      return INITIAL_PROFILES[0];
    }
  });

  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const refreshUser = async () => {
    if (!user) return;
    try {
      const updated = await crmService.getEmployeeById(user.id);
      if (updated) {
        setUser(updated);
        localStorage.setItem('vingo_current_user', JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Failed to refresh user', err);
    }
  };

  // Check Supabase session on mount if configured
  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          crmService.getEmployeeById(session.user.id).then((profile) => {
            if (profile) {
              setUser(profile);
              localStorage.setItem('vingo_current_user', JSON.stringify(profile));
            }
          });
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const profile = await crmService.getEmployeeById(session.user.id);
          if (profile) {
            setUser(profile);
            localStorage.setItem('vingo_current_user', JSON.stringify(profile));
          }
        } else {
          setUser(null);
          localStorage.removeItem('vingo_current_user');
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const login = async (email: string, password?: string) => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password || 'password123'
        });
        if (error) throw error;
        if (data.user) {
          const profile = await crmService.getEmployeeById(data.user.id);
          if (profile) {
            setUser(profile);
            localStorage.setItem('vingo_current_user', JSON.stringify(profile));
            showToast(`Welcome back, ${profile.name}!`, 'success');
          }
        }
      } else {
        // Fallback local auth
        const all = await crmService.getEmployees();
        const found = all.find((p) => p.email.toLowerCase() === email.trim().toLowerCase());
        if (!found) {
          throw new Error('User account not found with this email.');
        }
        setUser(found);
        localStorage.setItem('vingo_current_user', JSON.stringify(found));
        showToast(`Signed in as ${found.name} (${found.role.toUpperCase()})`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Login failed', 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const demoSwitch = async (email: string) => {
    try {
      const all = await crmService.getEmployees();
      const match = all.find((p) => p.email.toLowerCase() === email.toLowerCase());
      if (match) {
        setUser(match);
        localStorage.setItem('vingo_current_user', JSON.stringify(match));
        showToast(`Switched active profile to ${match.name} (${match.role === 'admin' ? 'Founder/Admin' : 'Employee'})`, 'info');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem('vingo_current_user');
    showToast('Signed out successfully.', 'info');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin: user?.role === 'admin',
        isEmployee: user?.role === 'employee',
        login,
        demoSwitch,
        logout,
        toasts,
        showToast,
        removeToast,
        refreshUser,
        isSupabaseConfigured
      }}
    >
      {children}

      {/* Global Toast Stack */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => removeToast(t.id)}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all transform animate-in slide-in-from-right duration-200 cursor-pointer min-w-[280px] max-w-[420px] ${
              t.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/40 text-emerald-300'
                : t.type === 'error'
                ? 'bg-slate-900/95 border-rose-500/40 text-rose-300'
                : 'bg-slate-900/95 border-indigo-500/40 text-indigo-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse bg-current" />
              <span>{t.message}</span>
            </div>
            <span className="text-xs opacity-60 hover:opacity-100">&times;</span>
          </div>
        ))}
      </div>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
