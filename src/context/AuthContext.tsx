import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile } from '../types/database';
import { crmService } from '../services/crmService';
import { isFounderOrAdminRole, isAccountActive } from '../lib/authConfig';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export type PortalLoginType = 'employee' | 'admin';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isFounderAdmin: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  login: (email: string, password?: string, portalType?: PortalLoginType) => Promise<UserProfile>;
  demoSwitch: (email: string, portalType?: PortalLoginType) => Promise<UserProfile>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  updatePassword: (newPassword: string) => Promise<void>;
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  refreshUser: () => Promise<void>;
  isSupabaseConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Validate verified profile status and security restrictions
  const validateUserProfile = useCallback((profile: UserProfile, portalType?: PortalLoginType): UserProfile => {
    // 1. Strict check: Deactivated or inactive accounts cannot access protected data
    if (!isAccountActive(profile.status)) {
      throw new Error('This account has been deactivated. Please contact your company administrator.');
    }

    // 2. Strict portal check: If user selected Founder/Admin Login, verify database role
    if (portalType === 'admin') {
      if (!isFounderOrAdminRole(profile.role)) {
        throw new Error('Access restricted: This account does not possess Founder/Admin privileges. Please use Employee Login.');
      }
    }

    return profile;
  }, []);

  // Refresh current user data from database
  const refreshUser = useCallback(async () => {
    if (!user) return;
    try {
      const updated = await crmService.getEmployeeById(user.id);
      if (updated) {
        if (!isAccountActive(updated.status)) {
          setUser(null);
          localStorage.removeItem('vingo_current_user');
          showToast('Session terminated: Account has been deactivated.', 'error');
          return;
        }
        setUser(updated);
        localStorage.setItem('vingo_current_user', JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Failed to refresh user', err);
    }
  }, [user, showToast]);

  // Session Initialization on Mount
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        if (isSupabaseConfigured) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && isMounted) {
            const profile = await crmService.getEmployeeById(session.user.id);
            if (profile && isAccountActive(profile.status)) {
              setUser(profile);
              localStorage.setItem('vingo_current_user', JSON.stringify(profile));
            } else {
              await supabase.auth.signOut();
              setUser(null);
              localStorage.removeItem('vingo_current_user');
            }
          }
        } else {
          // Restore from persistent storage in local/demo mode
          const stored = localStorage.getItem('vingo_current_user');
          if (stored && isMounted) {
            const parsed: UserProfile = JSON.parse(stored);
            // Verify from database store to prevent stale or manipulated local storage
            const verified = await crmService.getEmployeeById(parsed.id);
            if (verified && isAccountActive(verified.status)) {
              setUser(verified);
              localStorage.setItem('vingo_current_user', JSON.stringify(verified));
            } else {
              setUser(null);
              localStorage.removeItem('vingo_current_user');
            }
          }
        }
      } catch (err) {
        console.error('Session initialization error:', err);
        localStorage.removeItem('vingo_current_user');
        setUser(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Supabase auth state change subscription
    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const profile = await crmService.getEmployeeById(session.user.id);
          if (profile && isAccountActive(profile.status)) {
            setUser(profile);
            localStorage.setItem('vingo_current_user', JSON.stringify(profile));
          } else {
            setUser(null);
            localStorage.removeItem('vingo_current_user');
          }
        } else {
          setUser(null);
          localStorage.removeItem('vingo_current_user');
        }
        setLoading(false);
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (
    email: string,
    password?: string,
    portalType?: PortalLoginType
  ): Promise<UserProfile> => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password || 'password123',
        });
        if (error) throw error;
        if (!data.user) throw new Error('No user returned from authentication.');

        const profile = await crmService.getEmployeeById(data.user.id);
        if (!profile) {
          throw new Error('User profile record not found in database.');
        }

        const validated = validateUserProfile(profile, portalType);
        setUser(validated);
        localStorage.setItem('vingo_current_user', JSON.stringify(validated));
        showToast(`Welcome back, ${validated.name}!`, 'success');
        return validated;
      } else {
        // Fallback local / demo authentication
        const allEmployees = await crmService.getEmployees();
        const found = allEmployees.find((p) => p.email.toLowerCase() === cleanEmail);

        if (!found) {
          throw new Error('No registered company account found with this email.');
        }

        const validated = validateUserProfile(found, portalType);
        setUser(validated);
        localStorage.setItem('vingo_current_user', JSON.stringify(validated));
        showToast(`Signed in as ${validated.name} (${validated.role === 'founder_admin' ? 'Founder' : validated.role.toUpperCase()})`, 'success');
        return validated;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      showToast(message, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const demoSwitch = async (email: string, portalType?: PortalLoginType): Promise<UserProfile> => {
    try {
      const all = await crmService.getEmployees();
      const match = all.find((p) => p.email.toLowerCase() === email.toLowerCase());
      if (!match) {
        throw new Error('Profile not found');
      }

      const validated = validateUserProfile(match, portalType);
      setUser(validated);
      localStorage.setItem('vingo_current_user', JSON.stringify(validated));
      showToast(`Switched active profile to ${validated.name} (${validated.role === 'founder_admin' ? 'Founder' : validated.role === 'admin' ? 'Admin' : 'Employee'})`, 'info');
      return validated;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Demo switch failed';
      showToast(message, 'error');
      throw err;
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
      } else {
        // Local mode validation
        const all = await crmService.getEmployees();
        const exists = all.some((p) => p.email.toLowerCase() === cleanEmail);
        if (!exists) {
          throw new Error('No registered employee account found with this email.');
        }
      }

      showToast(`Password reset link dispatched to ${cleanEmail}`, 'success');
      return {
        success: true,
        message: `A password reset link has been dispatched to ${cleanEmail}. Please inspect your inbox.`,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send password reset link';
      showToast(message, 'error');
      throw err;
    }
  };

  const updatePassword = async (newPassword: string): Promise<void> => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
      }
      showToast('Password updated successfully.', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Password update failed';
      showToast(message, 'error');
      throw err;
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem('vingo_current_user');
    showToast('Signed out of session.', 'info');
  };

  const isFounderAdmin = user?.role === 'founder_admin';
  const isAdmin = user?.role === 'founder_admin' || user?.role === 'admin';
  const isEmployee = user?.role === 'employee';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isFounderAdmin,
        isAdmin,
        isEmployee,
        login,
        demoSwitch,
        logout,
        resetPassword,
        updatePassword,
        toasts,
        showToast,
        removeToast,
        refreshUser,
        isSupabaseConfigured,
      }}
    >
      {children}
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
