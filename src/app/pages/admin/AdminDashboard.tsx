import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Users, DollarSign, TrendingUp, Activity, LogOut } from 'lucide-react';
import { adminAPI } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [stats, setStats] = useState({
    totalBalance: 0,
    totalUsers: 0,
    totalTransactions: 0,
    revenue: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await adminAPI.getFinanceOverview();
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load stats');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const statCards = [
    {
      icon: DollarSign,
      label: 'Total Balance',
      value: `₦${stats.totalBalance.toLocaleString()}`,
      color: 'bg-green-500',
    },
    {
      icon: Users,
      label: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      color: 'bg-blue-500',
    },
    {
      icon: TrendingUp,
      label: 'Transactions',
      value: stats.totalTransactions.toLocaleString(),
      color: 'bg-purple-500',
    },
    {
      icon: Activity,
      label: 'Revenue',
      value: `₦${stats.revenue.toLocaleString()}`,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Admin Dashboard</h1>
            <p className="text-white/80 text-sm">GLY VTU Management</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-white/80 hover:text-white flex items-center gap-2"
          >
            <LogOut size={20} />
            <span className="text-sm">Logout</span>
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20"
            >
              <div
                className={`${card.color} w-10 h-10 rounded-full flex items-center justify-center mb-3`}
              >
                <card.icon size={20} className="text-white" />
              </div>
              <p className="text-white/80 text-xs mb-1">{card.label}</p>
              <p className="text-white text-xl font-bold">{card.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow hover:shadow-md transition-shadow text-left">
            <Users size={24} className="text-[#235697] mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Manage Users</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              View and manage user accounts
            </p>
          </button>

          <button className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow hover:shadow-md transition-shadow text-left">
            <Activity size={24} className="text-[#235697] mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Transactions</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Monitor all transactions
            </p>
          </button>

          <button className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow hover:shadow-md transition-shadow text-left">
            <TrendingUp size={24} className="text-[#235697] mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Analytics</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              View reports and analytics
            </p>
          </button>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6">
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              No recent activity to display
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
