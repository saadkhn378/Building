import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminLayout } from './layouts/AdminLayout';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { StructurePage } from './pages/StructurePage';
import { OwnersPage } from './pages/OwnersPage';
import { BillsPage } from './pages/BillsPage';
import { VerificationPage } from './pages/VerificationPage';
import { CashPaymentPage } from './pages/CashPaymentPage';
import { ReceiptsPage } from './pages/ReceiptsPage';
import { ComplaintsPage } from './pages/ComplaintsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-slate-400">
        Authenticating session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="structure" element={<StructurePage />} />
            <Route path="owners" element={<OwnersPage />} />
            <Route path="bills" element={<BillsPage />} />
            <Route path="verification" element={<VerificationPage />} />
            <Route path="cash-payment" element={<CashPaymentPage />} />
            <Route path="receipts" element={<ReceiptsPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="complaints" element={<ComplaintsPage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
