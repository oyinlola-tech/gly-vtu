import { useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { ThemeProvider } from '../contexts/ThemeContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { AdminAuthProvider, useAdminAuth } from '../contexts/AdminAuthContext';
import SplashScreen from './components/SplashScreen';
import NotificationListener from './components/NotificationListener';
import LoadingSpinner from './components/LoadingSpinner';

// Auth Pages (code-split)
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const SetPIN = lazy(() => import('./pages/SetPIN'));
const VerifyDevice = lazy(() => import('./pages/VerifyDevice'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

// User Pages (code-split)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const SendMoney = lazy(() => import('./pages/SendMoney'));
const SendToBank = lazy(() => import('./pages/SendToBank'));
const SendToUser = lazy(() => import('./pages/SendToUser'));
const ComingSoon = lazy(() => import('./pages/ComingSoon'));
const Transactions = lazy(() => import('./pages/Transactions'));
const TransactionDetails = lazy(() => import('./pages/TransactionDetails'));
const BuyAirtime = lazy(() => import('./pages/BuyAirtime'));
const BuyData = lazy(() => import('./pages/BuyData'));
const PayTV = lazy(() => import('./pages/PayTV'));
const PayElectricity = lazy(() => import('./pages/PayElectricity'));
const TransactionSuccess = lazy(() => import('./pages/TransactionSuccess'));
const Bills = lazy(() => import('./pages/Bills'));
const Cards = lazy(() => import('./pages/Cards'));
const More = lazy(() => import('./pages/More'));
const AddMoney = lazy(() => import('./pages/AddMoney'));
const Profile = lazy(() => import('./pages/Profile'));
const Security = lazy(() => import('./pages/Security'));
const SecurityCenter = lazy(() => import('./pages/SecurityCenter'));
const TwoFactorSetup = lazy(() => import('./pages/TwoFactorSetup'));
const DeviceManagement = lazy(() => import('./pages/DeviceManagement'));
const Notifications = lazy(() => import('./pages/Notifications'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const TermsPrivacy = lazy(() => import('./pages/TermsPrivacy'));
const SecurityTips = lazy(() => import('./pages/SecurityTips'));
const KYC = lazy(() => import('./pages/KYC'));
const KycStatusLimits = lazy(() => import('./pages/KycStatusLimits'));
const CompliancePolicies = lazy(() => import('./pages/CompliancePolicies'));
const Disputes = lazy(() => import('./pages/Disputes'));

// Admin Pages (code-split)
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminTransactions = lazy(() => import('./pages/admin/AdminTransactions'));
const AdminReview = lazy(() => import('./pages/admin/AdminReview'));
const AdminAuditLogs = lazy(() => import('./pages/admin/AdminAuditLogs'));

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, checking } = useAdminAuth();
  if (checking) return null;
  return isAdmin ? <>{children}</> : <Navigate to="/admin/login" />;
}

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      {!showSplash && (
        <Suspense
          fallback={
            <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-white dark:bg-gray-950">
              <LoadingSpinner size="lg" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading page...</p>
            </div>
          }
        >
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/set-pin" element={<SetPIN />} />
            <Route path="/verify-device" element={<VerifyDevice />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

          {/* User Routes - Dashboard */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          {/* User Routes - Send Money */}
          <Route
            path="/send"
            element={
              <PrivateRoute>
                <SendMoney />
              </PrivateRoute>
            }
          />
          <Route
            path="/send/bank"
            element={
              <PrivateRoute>
                <SendToBank />
              </PrivateRoute>
            }
          />
          <Route
            path="/send/swift-pay"
            element={
              <PrivateRoute>
                <SendToUser />
              </PrivateRoute>
            }
          />
          <Route
            path="/send/enaira"
            element={
              <PrivateRoute>
                <ComingSoon
                  title="eNaira"
                  description="eNaira transfers are coming soon. We'll notify you once the service is live."
                  backTo="/send"
                />
              </PrivateRoute>
            }
          />

          {/* User Routes - Transactions */}
          <Route
            path="/transactions"
            element={
              <PrivateRoute>
                <Transactions />
              </PrivateRoute>
            }
          />
          <Route
            path="/transaction/:id"
            element={
              <PrivateRoute>
                <TransactionDetails />
              </PrivateRoute>
            }
          />
          <Route path="/transaction-success" element={<TransactionSuccess />} />

          {/* User Routes - Bills Payment */}
          <Route
            path="/bills/airtime"
            element={
              <PrivateRoute>
                <BuyAirtime />
              </PrivateRoute>
            }
          />
          <Route
            path="/bills/data"
            element={
              <PrivateRoute>
                <BuyData />
              </PrivateRoute>
            }
          />
          <Route
            path="/bills/tv"
            element={
              <PrivateRoute>
                <PayTV />
              </PrivateRoute>
            }
          />
          <Route
            path="/bills/electricity"
            element={
              <PrivateRoute>
                <PayElectricity />
              </PrivateRoute>
            }
          />

          {/* User Routes - Other */}
          <Route
            path="/add-money"
            element={
              <PrivateRoute>
                <AddMoney />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="/security"
            element={
              <PrivateRoute>
                <Security />
              </PrivateRoute>
            }
          />
          <Route
            path="/security-center"
            element={
              <PrivateRoute>
                <SecurityCenter />
              </PrivateRoute>
            }
          />
          <Route
            path="/auth/setup-2fa"
            element={
              <PrivateRoute>
                <TwoFactorSetup />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/devices"
            element={
              <PrivateRoute>
                <DeviceManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <PrivateRoute>
                <Notifications />
              </PrivateRoute>
            }
          />
          <Route
            path="/help"
            element={
              <PrivateRoute>
                <HelpCenter />
              </PrivateRoute>
            }
          />
          <Route
            path="/terms"
            element={
              <PrivateRoute>
                <TermsPrivacy />
              </PrivateRoute>
            }
          />
          <Route
            path="/compliance"
            element={
              <PrivateRoute>
                <CompliancePolicies />
              </PrivateRoute>
            }
          />
          <Route
            path="/disputes"
            element={
              <PrivateRoute>
                <Disputes />
              </PrivateRoute>
            }
          />
          <Route
            path="/security-tips"
            element={
              <PrivateRoute>
                <SecurityTips />
              </PrivateRoute>
            }
          />
          <Route
            path="/kyc"
            element={
              <PrivateRoute>
                <KYC />
              </PrivateRoute>
            }
          />
          <Route
            path="/kyc-status"
            element={
              <PrivateRoute>
                <KycStatusLimits />
              </PrivateRoute>
            }
          />
          <Route
            path="/bills"
            element={
              <PrivateRoute>
                <Bills />
              </PrivateRoute>
            }
          />
          <Route
            path="/cards"
            element={
              <PrivateRoute>
                <Cards />
              </PrivateRoute>
            }
          />
          <Route
            path="/more"
            element={
              <PrivateRoute>
                <More />
              </PrivateRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/transactions"
            element={
              <AdminRoute>
                <AdminTransactions />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/review"
            element={
              <AdminRoute>
                <AdminReview />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <AdminRoute>
                <AdminAuditLogs />
              </AdminRoute>
            }
          />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Catch all */}
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Suspense>
      )}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AdminAuthProvider>
          <BrowserRouter>
            <div className="size-full bg-white dark:bg-gray-950">
              <AppContent />
              <NotificationListener />
            </div>
          </BrowserRouter>
        </AdminAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
