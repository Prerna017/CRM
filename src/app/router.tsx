import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { LeadsPage } from "@/pages/LeadsPage";
import { AttendancePage } from "@/pages/AttendancePage";
import { LeavesPage } from "@/pages/LeavesPage";
import { EmployeesPage } from "@/pages/EmployeesPage";
import { AnnouncementsPage } from "@/pages/AnnouncementsPage";
import { PoliciesPage } from "@/pages/PoliciesPage";
import { HolidaysPage } from "@/pages/HolidaysPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { LoginPage } from "@/pages/LoginPage";

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="leaves" element={<LeavesPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="policies" element={<PoliciesPage />} />
          <Route path="holidays" element={<HolidaysPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
