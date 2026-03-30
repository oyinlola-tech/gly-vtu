import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  Eye, EyeOff, Plus, Send, CreditCard, Phone, Wifi, Tv, Zap,
  Sun, Moon, Bell, Wallet, Receipt, ShieldCheck
} from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { walletAPI, userAPI } from '../../services/api';

export default function Dashboard() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showBalance, setShowBalance] = useState(true);
  const [balance, setBalance] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [kycInfo, setKycInfo] = useState<any>(null);
  const [securityStatus, setSecurityStatus] = useState<any>(null);
  const [deviceCount, setDeviceCount] = useState(0);
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [balanceRes, txns, kyc, security, sessions, events] = await Promise.all([
        walletAPI.getBalance(),
        walletAPI.getTransactions(),
        userAPI.getKycLimits(),
        userAPI.getSecurityStatus(),
        userAPI.getSessions(),
        userAPI.getSecurityEvents({ limit: 3 }),
      ]);
      setBalance(Number(balanceRes?.balance || 0));
      setLastUpdated(new Date().toISOString());
      setRecentTransactions(
        (txns || []).slice(0, 5).map((txn: any) => {
          let metadata: any = txn.metadata;
          if (typeof metadata === 'string') {
            try {
              metadata = JSON.parse(metadata);
            } catch {
              metadata = {};
            }
          }
          const type =
            txn.type === 'receive' || txn.type === 'topup' ? 'credit' : 'debit';
          const label =
            metadata?.provider ||
            metadata?.accountName ||
            metadata?.to ||
            metadata?.accountNumber ||
            'Transaction';
          return {
            id: txn.id,
            name: label,
            amount: `${type === 'credit' ? '+' : '-'}₦${Number(txn.total || txn.amount || 0).toLocaleString('en-NG', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            time: new Date(txn.created_at).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }),
            type,
          };
        })
      );
      setKycInfo(kyc);
      setSecurityStatus(security);
      setDeviceCount((sessions || []).length);
      setSecurityEvents(events || []);
    } catch (err) {
      console.error('Failed to load dashboard data');
    }
  };

  const quickActions = [
    { icon: Phone, label: 'Airtime', color: 'bg-orange-500', path: '/bills/airtime' },
    { icon: Wifi, label: 'Data Bundle', color: 'bg-blue-500', path: '/bills/data' },
    { icon: Tv, label: 'TV', color: 'bg-purple-500', path: '/bills/tv' },
    { icon: Zap, label: 'Electricity', color: 'bg-yellow-500', path: '/bills/electricity' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      {/* Header with Gradient */}
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] rounded-b-[24px] p-6 pb-24">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-white/80 text-sm">Hi, {user?.fullName?.split(' ')[0]}</p>
            <p className="text-white text-lg font-semibold">Welcome, let's start making payments</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              {theme === 'dark' ? <Sun size={20} className="text-white" /> : <Moon size={20} className="text-white" />}
            </button>
            <Link to="/notifications" className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
              <Bell size={20} className="text-white" />
            </Link>
          </div>
        </div>

        {/* Balance Card */}
        <div className="bg-[#235697] rounded-2xl p-6 relative overflow-hidden shadow-xl">
          <div className="absolute right-0 top-0 w-64 h-64 bg-black/10 rounded-full -mr-32 -mt-32" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <p className="text-white/80 text-xs">Total Balance</p>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="text-white/80"
              >
                {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 ${
                  securityStatus?.totpEnabled ? 'bg-green-500/20 text-green-100' : 'bg-yellow-500/20 text-yellow-100'
                }`}
              >
                <ShieldCheck size={12} />
                {securityStatus?.totpEnabled ? 'Secure' : 'Protection needed'}
              </span>
            </div>
            <h2 className="text-white text-3xl font-bold mb-2">
              {showBalance
                ? `₦${balance.toLocaleString('en-NG', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : '₦****'}
            </h2>
            <p className="text-white/60 text-xs">
              {lastUpdated ? `Last updated ${new Date(lastUpdated).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}` : 'Last updated just now'}
            </p>

            <div className="mt-6 flex items-center gap-2">
              <div className="bg-white/20 rounded-full px-3 py-1">
                <p className="text-white text-xs">
                  {user?.bankName ? user.bankName : 'Wallet Account'}
                </p>
              </div>
              <div className="ml-auto bg-white/20 rounded-full p-2">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2L12 8H18L13 12L15 18L10 14L5 18L7 12L2 8H8L10 2Z" fill="white"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 -mt-16">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-4 mb-6 transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Security Status</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">Your account</p>
            </div>
            <Link to="/security-center" className="text-xs text-[#235697] font-semibold">
              Manage
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-gray-500 dark:text-gray-400">2FA</p>
              <p className={`font-semibold ${securityStatus?.totpEnabled ? 'text-green-600' : 'text-yellow-600'}`}>
                {securityStatus?.totpEnabled ? 'Enabled' : 'Off'}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-gray-500 dark:text-gray-400">PIN</p>
              <p className={`font-semibold ${securityStatus?.pinSet ? 'text-green-600' : 'text-red-600'}`}>
                {securityStatus?.pinSet ? 'Set' : 'Missing'}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-gray-500 dark:text-gray-400">Devices</p>
              <p className="font-semibold text-gray-900 dark:text-white">{deviceCount}</p>
            </div>
          </div>
          {(!securityStatus?.totpEnabled || securityEvents.length) && (
            <div className="mt-4 space-y-2">
              {!securityStatus?.totpEnabled && (
                <div className="text-xs bg-yellow-50 border border-yellow-200 rounded-xl p-2 text-yellow-700">
                  2FA is off. Enable it to protect your account.
                </div>
              )}
              {securityEvents.map((event) => (
                <div
                  key={event.id}
                  className="text-xs bg-red-50 border border-red-200 rounded-xl p-2 text-red-700"
                >
                  Security alert: {event.event_type?.replace(/\./g, ' ') || 'Event detected'}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-4 mb-6 transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">KYC Tier</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                Level {kycInfo?.level || 1}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Status: {kycInfo?.status || 'pending'}
              </p>
            </div>
            <Link
              to="/kyc-status"
              className="text-xs text-[#235697] font-semibold"
            >
              View limits
            </Link>
          </div>
        </div>
        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-4 mb-6">
          <div className="flex items-center justify-around">
            <Link to="/add-money" className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Plus className="text-[#235697]" size={24} />
              </div>
              <span className="text-xs text-[#3a3c4c] dark:text-white">Add money</span>
            </Link>
            <Link to="/send" className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Send className="text-[#235697]" size={24} />
              </div>
              <span className="text-xs text-[#3a3c4c] dark:text-white">Send money</span>
            </Link>
            <Link to="/cards" className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <CreditCard className="text-[#235697]" size={24} />
              </div>
              <span className="text-xs text-[#3a3c4c] dark:text-white">My cards</span>
            </Link>
          </div>
        </div>

        {/* Get Started Section */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-[#3a3c4c] dark:text-white mb-4">Get started</h3>
          <div className="space-y-3">
            <Link to="/add-money" className="bg-white dark:bg-gray-900 rounded-xl p-4 flex items-center gap-4 shadow hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-full bg-[#f1f5f9] dark:bg-gray-800 flex items-center justify-center">
                <Wallet size={20} className="text-[#235697]" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[#3b3d4b] dark:text-white text-sm">Add money</p>
                <p className="text-xs text-[#7d7c93] dark:text-gray-400">Fund your wallet easily</p>
              </div>
              <span className="text-[#7d7c93]">›</span>
            </Link>

            <Link to="/cards" className="bg-white dark:bg-gray-900 rounded-xl p-4 flex items-center gap-4 shadow hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-full bg-[#f1f5f9] dark:bg-gray-800 flex items-center justify-center">
                <CreditCard size={20} className="text-[#235697]" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[#3b3d4b] dark:text-white text-sm">My Cards</p>
                <p className="text-xs text-[#7d7c93] dark:text-gray-400">Manage your virtual cards</p>
              </div>
              <span className="text-[#7d7c93]">›</span>
            </Link>
          </div>
        </div>

        {/* Quick Access Bills */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-[#3a3c4c] dark:text-white mb-4">Quick access</h3>
          <div className="grid grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.path}
                className="flex flex-col items-center gap-2"
              >
                <div className={`${action.color} w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg`}>
                  <action.icon className="text-white" size={24} />
                </div>
                <span className="text-xs text-[#3a3c4c] dark:text-white text-center">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#3a3c4c] dark:text-white">TODAY</h3>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-8 text-center">
              <p className="text-[#7d7c93] dark:text-gray-400">You haven't made any transactions yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="bg-white dark:bg-gray-900 rounded-xl p-4 flex items-center gap-4 shadow"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    transaction.type === 'credit' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <span className="text-xl">
                      {transaction.type === 'credit' ? '↓' : '↑'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#3b3d4b] dark:text-white text-sm">
                      {transaction.name}
                    </p>
                    <p className="text-xs text-[#7d7c93] dark:text-gray-400">{transaction.time}</p>
                  </div>
                  <p className={`font-semibold ${
                    transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.amount}
                  </p>
                </div>
              ))}
            </div>
          )}

          <Link
            to="/transactions"
            className="mt-4 w-full bg-[#235697] text-white py-4 rounded-xl font-semibold text-center block"
          >
            See all transactions
          </Link>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
