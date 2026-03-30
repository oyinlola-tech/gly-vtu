import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { ThemeProvider } from '../contexts/ThemeContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import SplashScreen from './components/SplashScreen';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import SetPIN from './pages/SetPIN';

// User Pages
import Dashboard from './pages/Dashboard';
import SendMoney from './pages/SendMoney';
import SendToBank from './pages/SendToBank';
import Transactions from './pages/Transactions';
import BuyAirtime from './pages/BuyAirtime';
import BuyData from './pages/BuyData';
import TransactionSuccess from './pages/TransactionSuccess';
import Bills from './pages/Bills';
import Cards from './pages/Cards';
import More from './pages/More';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
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
                <SendToBank />
              </PrivateRoute>
            }
          />
          <Route
            path="/send/enaira"
            element={
              <PrivateRoute>
                <SendToBank />
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

          {/* User Routes - Other */}
          <Route
            path="/add-money"
            element={
              <PrivateRoute>
                <Dashboard />
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
              <PrivateRoute>
                <AdminDashboard />
              </PrivateRoute>
            }
          />

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
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}