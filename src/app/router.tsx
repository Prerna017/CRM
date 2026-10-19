import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Loader2, Briefcase } from 'lucide-react';

// Core Pages
import { DashboardPage } from '@/pages/DashboardPage';
import { LeadsPage } from '@/pages/LeadsPage';
import { AttendancePage } from '@/pages/AttendancePage';
import { LeavesPage } from '@/pages/LeavesPage';
import { EmployeesPage } from '@/pages/EmployeesPage';
import { AnnouncementsPage } from '@/pages/AnnouncementsPage';
import { PoliciesPage } from '@/pages/PoliciesPage';
import { HolidaysPage } from '@/pages/HolidaysPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { LoginPage } from '@/pages/LoginPage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';

// Module & EmptyState Pages
import { DeadLeadsPage } from '@/pages/DeadLeadsPage';
import { EmailRepliesPage } from '@/pages/EmailRepliesPage';
import { FollowupsPage } from '@/pages/FollowupsPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { ActivityLogsPage } from '@/pages/ActivityLogsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ApplyLeavePage } from '@/pages/ApplyLeavePage';
import { LeaveHistoryPage } from '@/pages/LeaveHistoryPage';
import { MyLeadsPage } from '@/pages/MyLeadsPage';

// Global Session Loading Screen
export const SessionLoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
    <div className="relative flex items-center justify-center mb-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 animate-pulse">
        <Briefcase className="h-8 w-8" />
      </div>
      <div className="absolute -inset-2 rounded-3xl border border-indigo-500/20 animate-ping" />
    </div>
    <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold">
      <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
      <span>Restoring verified security session...</span>
    </div>
    <span className="text-[11px] text-slate-500 mt-1">Verifying database permissions &amp; role policies</span>
  </div>
);

// ProtectedRoute: Ensures user is authenticated and not deactivated
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <SessionLoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.status === 'deactivated' || user.status === 'inactive') {
    return <Navigate to="/unauthorized?reason=deactivated" replace />;
  }

  return <>{children}</>;
};

// AdminRoute: Restricts access strictly to founder_admin or admin
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return <SessionLoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
};

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />

        {/* Authenticated Workspace Shell */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Shared / Dynamic Role Views */}
          <Route index element={<DashboardPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="leaves" element={<LeavesPage />} />
          <Route path="holidays" element={<HolidaysPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="policies" element={<PoliciesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />

          {/* Leads & Follow-ups */}
          <Route path="leads" element={<LeadsPage />} />
          <Route path="leads/my" element={<MyLeadsPage />} />
          <Route path="leads/dead" element={<DeadLeadsPage />} />
          <Route path="leads/followups" element={<FollowupsPage />} />
          <Route path="email/replies" element={<EmailRepliesPage />} />

          {/* Employee-Specific Routes */}
          <Route path="profile" element={<ProfilePage />} />
          <Route path="leaves/apply" element={<ApplyLeavePage />} />
          <Route path="leaves/history" element={<LeaveHistoryPage />} />

          {/* Admin & Founder Privileged Routes */}
          <Route
            path="employees"
            element={
              <AdminRoute>
                <EmployeesPage />
              </AdminRoute>
            }
          />
          <Route
            path="reports"
            element={
              <AdminRoute>
                <ReportsPage />
              </AdminRoute>
            }
          />
          <Route
            path="activity-logs"
            element={
              <AdminRoute>
                <ActivityLogsPage />
              </AdminRoute>
            }
          />
          <Route
            path="settings"
            element={
              <AdminRoute>
                <SettingsPage />
              </AdminRoute>
            }
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
