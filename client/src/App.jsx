import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './context/ToastContext';

// Common Components
import { Navbar } from './components/common/Navbar';

// Pages
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { RegisterBusinessPage } from './pages/auth/RegisterBusinessPage';
import { RegisterPartnerPage } from './pages/auth/RegisterPartnerPage';

// Business Pages
import { BusinessDashboard } from './pages/business/BusinessDashboard';
import { CreateOrderPage } from './pages/business/CreateOrderPage';
import { OrderHistoryPage } from './pages/business/OrderHistoryPage';

// Partner Pages
import { PartnerWorkspace } from './pages/partner/PartnerWorkspace';
import { PartnerEarningsPage } from './pages/partner/PartnerEarningsPage';
import { PartnerProfilePage } from './pages/partner/PartnerProfilePage';

// Admin Pages
import { AdminConsole } from './pages/admin/AdminConsole';
import { PartnerVerificationPage } from './pages/admin/PartnerVerificationPage';
import { FleetMonitoringPage } from './pages/admin/FleetMonitoringPage';
import { DisputeManagementPage } from './pages/admin/DisputeManagementPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';

// Shared Pages
import { OrderTrackingPage } from './pages/shared/OrderTrackingPage';
import { CustomerTrackingPage } from './pages/public/CustomerTrackingPage';
import { TrackOrderLookupPage } from './pages/public/TrackOrderLookupPage';

// Route Guards
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs text-ink-500 font-mono">
        Authenticating SwiftFleet session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their role home
    if (user.role === 'business') return <Navigate to="/business" replace />;
    if (user.role === 'partner') return <Navigate to="/partner" replace />;
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <SocketProvider>
          <Router>
            <div className="min-h-screen flex flex-col bg-ink-50 text-ink-900 font-sans">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  {/* Public Pages */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/register-business" element={<RegisterBusinessPage />} />
                  <Route path="/register-partner" element={<RegisterPartnerPage />} />
                  <Route path="/track" element={<TrackOrderLookupPage />} />
                  <Route path="/track/:token" element={<CustomerTrackingPage />} />

                  {/* Business Routes */}
                  <Route
                    path="/business"
                    element={
                      <ProtectedRoute allowedRoles={['business', 'admin']}>
                        <BusinessDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/business/create"
                    element={
                      <ProtectedRoute allowedRoles={['business', 'admin']}>
                        <CreateOrderPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/business/history"
                    element={
                      <ProtectedRoute allowedRoles={['business', 'admin']}>
                        <OrderHistoryPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Courier / Partner Routes */}
                  <Route
                    path="/partner"
                    element={
                      <ProtectedRoute allowedRoles={['partner', 'admin']}>
                        <PartnerWorkspace />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/partner/earnings"
                    element={
                      <ProtectedRoute allowedRoles={['partner', 'admin']}>
                        <PartnerEarningsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/partner/profile"
                    element={
                      <ProtectedRoute allowedRoles={['partner', 'admin']}>
                        <PartnerProfilePage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin Ops Console Routes */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminConsole />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/verification"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <PartnerVerificationPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/fleet"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <FleetMonitoringPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/disputes"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <DisputeManagementPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/audit"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AuditLogsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Shared Order Tracking */}
                  <Route path="/orders/new" element={<Navigate to="/business/create" replace />} />
                  <Route path="/orders/create" element={<Navigate to="/business/create" replace />} />
                  <Route
                    path="/orders/:id"
                    element={
                      <ProtectedRoute allowedRoles={['business', 'partner', 'admin']}>
                        <OrderTrackingPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </Router>
        </SocketProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
