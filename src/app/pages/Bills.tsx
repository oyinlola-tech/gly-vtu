import { Link } from 'react-router';
import { ChevronLeft, Phone, Wifi, Tv, Zap, Droplet, Wifi as Internet, ChevronRight } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { useTheme } from '../../contexts/ThemeContext';

export default function Bills() {
  const { theme } = useTheme();

  const billCategories = [
    {
      icon: Phone,
      title: 'Airtime',
      description: 'Buy airtime for all networks',
      color: 'bg-orange-500',
      path: '/bills/airtime',
    },
    {
      icon: Wifi,
      title: 'Data Bundle',
      description: 'Subscribe to data plans',
      color: 'bg-blue-500',
      path: '/bills/data',
    },
    {
      icon: Tv,
      title: 'TV Subscription',
      description: 'DSTV, GOtv, Startimes & more',
      color: 'bg-purple-500',
      path: '/bills/tv',
    },
    {
      icon: Zap,
      title: 'Electricity',
      description: 'Pay electricity bills',
      color: 'bg-yellow-500',
      path: '/bills/electricity',
    },
    {
      icon: Internet,
      title: 'Internet',
      description: 'Pay for internet services',
      color: 'bg-green-500',
      path: '/bills/internet',
      comingSoon: true,
    },
    {
      icon: Droplet,
      title: 'Water Bill',
      description: 'Pay water utility bills',
      color: 'bg-cyan-500',
      path: '/bills/water',
      comingSoon: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-24 rounded-b-[24px]">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/dashboard" className="text-white">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-white">Bills & Utilities</h1>
        </div>

        <p className="text-white/80 text-sm">
          Pay for airtime, data, TV subscriptions, electricity and other utilities
        </p>
      </div>

      <div className="px-6 -mt-16">
        <div className="space-y-3">
          {billCategories.map((category) => (
            <Link
              key={category.title}
              to={category.comingSoon ? '#' : category.path}
              className={`bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-lg flex items-center gap-4 ${
                category.comingSoon
                  ? 'opacity-60 cursor-not-allowed'
                  : 'hover:shadow-xl transition-shadow'
              }`}
              onClick={(e) => category.comingSoon && e.preventDefault()}
            >
              <div className={`${category.color} w-14 h-14 rounded-2xl flex items-center justify-center shadow-md`}>
                <category.icon size={28} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {category.title}
                  {category.comingSoon && (
                    <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                      Coming Soon
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{category.description}</p>
              </div>
              {!category.comingSoon && (
                <ChevronRight size={20} className="text-gray-400" />
              )}
            </Link>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">This Month</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">₦12,450</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Transactions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">8</p>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
