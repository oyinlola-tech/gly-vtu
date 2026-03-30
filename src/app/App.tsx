import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { ThemeProvider } from '../contexts/ThemeContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import SplashScreen from './components/SplashScreen';
import { tokenStore } from '../services/api';
import NotificationListener from './components/NotificationListener';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import SetPIN from './pages/SetPIN';
import VerifyDevice from './pages/VerifyDevice';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// User Pages
import Dashboard from './pages/Dashboard';
import SendMoney from './pages/SendMoney';
import SendToBank from './pages/SendToBank';
import SendToUser from './pages/SendToUser';
import ComingSoon from './pages/ComingSoon';
import Transactions from './pages/Transactions';
import BuyAirtime from './pages/BuyAirtime';
import BuyData from './pages/BuyData';
import PayTV from './pages/PayTV';
import PayElectricity from './pages/PayElectricity';
import TransactionSuccess from './pages/TransactionSuccess';
import Bills from './pages/Bills';
import Cards from './pages/Cards';
import More from './pages/More';
import AddMoney from './pages/AddMoney';
import Profile from './pages/Profile';
import Security from './pages/Security';
import SecurityCenter from './pages/SecurityCenter';
import Notifications from './pages/Notifications';
import HelpCenter from './pages/HelpCenter';
import TermsPrivacy from './pages/TermsPrivacy';
import SecurityTips from './pages/SecurityTips';
import KYC from './pages/KYC';
import KycStatusLimits from './pages/KycStatusLimits';
import CompliancePolicies from './pages/CompliancePolicies';
import Disputes from './pages/Disputes';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLogin from './pages/admin/AdminLogin';
import AdminTransactions from './pages/admin/AdminTransactions';
import AdminReview from './pages/admin/AdminReview';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAdmin = !!tokenStore.getAdminToken();
  return isAdmin ? <>{children}</> : <Navigate to="/admin/login" />;
}

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      {!showSplash && (
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
                <Transactions />
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
      )}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="size-full bg-white dark:bg-gray-950">
            <AppContent />
            <NotificationListener />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
