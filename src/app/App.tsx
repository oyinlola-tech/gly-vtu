import { useState, Suspense, lazy } from 'react';
import type { ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { ThemeProvider } from '../contexts/ThemeContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { AdminAuthProvider, useAdminAuth } from '../contexts/AdminAuthContext';
import SplashScreen from './components/SplashScreen';
import NotificationListener from './components/NotificationListener';
import LoadingSpinner from './components/LoadingSpinner';
import SecurityAlertBanner from './components/SecurityAlertBanner';
import SupportChat from './components/SupportChat';

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
const SecurityDashboard = lazy(() => import('./pages/SecurityDashboard'));
const PasswordChangePage = lazy(() => import('./pages/PasswordChangePage'));
const SecurityActivityPage = lazy(() => import('./pages/SecurityActivityPage'));
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
const WalletManagementPage = lazy(() => import('./pages/WalletManagementPage'));
const TransactionHistoryPage = lazy(() => import('./pages/TransactionHistoryPage'));
const TransactionDetailsPage = lazy(() => import('./pages/TransactionDetailsPage'));
const SessionManagement = lazy(() => import('./pages/SessionManagement'));
const TransactionReceipt = lazy(() => import('./pages/TransactionReceipt'));
const AccountClosure = lazy(() => import('./pages/AccountClosure'));
const AccountClosureCancel = lazy(() => import('./pages/AccountClosureCancel'));
const DataExport = lazy(() => import('./pages/DataExport'));
const BiometricSetup = lazy(() => import('./pages/BiometricSetup'));
const Error400 = lazy(() => import('./pages/Error400'));
const Error403 = lazy(() => import('./pages/Error403'));
const Error404 = lazy(() => import('./pages/Error404'));
const Error500 = lazy(() => import('./pages/Error500'));
const Maintenance = lazy(() => import('./pages/Maintenance'));
const Offline = lazy(() => import('./pages/Offline'));

// Admin Pages (code-split)
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminTransactions = lazy(() => import('./pages/admin/AdminTransactions'));
const AdminReview = lazy(() => import('./pages/admin/AdminReview'));
const AdminAuditLogs = lazy(() => import('./pages/admin/AdminAuditLogs'));
const SecurityEventsDashboard = lazy(() => import('./pages/admin/SecurityEventsDashboard'));
const AnomalyDetection = lazy(() => import('./pages/admin/AnomalyDetection'));
const ComplianceManagement = lazy(() => import('./pages/admin/ComplianceManagement'));

function PrivateRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { isAdmin, checking } = useAdminAuth();
  if (checking) return null;
  return isAdmin ? <>{children}</> : <Navigate to="/admin/login" />;
}

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const [supportOpen, setSupportOpen] = useState(false);

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
          <SecurityAlertBanner />
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
            path="/send/gly-vtu"
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
            path="/security/dashboard"
            element={
              <PrivateRoute>
                <SecurityDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/security/password"
            element={
              <PrivateRoute>
                <PasswordChangePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/security/activity"
            element={
              <PrivateRoute>
                <SecurityActivityPage />
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
            path="/security/sessions"
            element={
              <PrivateRoute>
                <SessionManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/wallet"
            element={
              <PrivateRoute>
                <WalletManagementPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/transactions/history"
            element={
              <PrivateRoute>
                <TransactionHistoryPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/transactions/:id"
            element={
              <PrivateRoute>
                <TransactionDetailsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/transactions/:id/receipt"
            element={
              <PrivateRoute>
                <TransactionReceipt />
              </PrivateRoute>
            }
          />
          <Route
            path="/account/closure"
            element={
              <PrivateRoute>
                <AccountClosure />
              </PrivateRoute>
            }
          />
          <Route path="/account/closure/cancel" element={<AccountClosureCancel />} />
          <Route
            path="/account/data-export"
            element={
              <PrivateRoute>
                <DataExport />
              </PrivateRoute>
            }
          />
          <Route
            path="/security/biometric"
            element={
              <PrivateRoute>
                <BiometricSetup />
              </PrivateRoute>
            }
          />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/offline" element={<Offline />} />
          <Route path="/error/400" element={<Error400 />} />
          <Route path="/error/403" element={<Error403 />} />
          <Route path="/error/404" element={<Error404 />} />
          <Route path="/error/500" element={<Error500 />} />
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
          <Route
            path="/admin/security-events"
            element={
              <AdminRoute>
                <SecurityEventsDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/anomalies"
            element={
              <AdminRoute>
                <AnomalyDetection />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/compliance"
            element={
              <AdminRoute>
                <ComplianceManagement />
              </AdminRoute>
            }
          />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Catch all */}
            <Route path="*" element={<Error404 />} />
          </Routes>
        </Suspense>
      )}
      {!showSplash && (
        <>
          <button
            onClick={() => setSupportOpen(true)}
            className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#235697] text-white shadow-xl flex items-center justify-center"
            aria-label="Open support chat"
          >
            <HelpCircle size={22} />
          </button>
          {supportOpen && <SupportChat onClose={() => setSupportOpen(false)} />}
        </>
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
