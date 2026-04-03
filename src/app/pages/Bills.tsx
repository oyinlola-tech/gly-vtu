import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, Phone, Wifi, Tv, Zap, Droplet, Wifi as Internet, ChevronRight } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { billsAPI } from '../../services/api';
import type { BillCategory } from '../../types/bills';

export default function Bills() {
  const [categories, setCategories] = useState<BillCategory[]>([]);

  useEffect(() => {
    billsAPI
      .getCategories()
      .then((data) => setCategories(data || []))
      .catch(() => null);
  }, []);

  type IconType = ComponentType<{ size?: number; className?: string }>;
  const iconMap: Record<string, IconType> = {
    airtime: Phone,
    data: Wifi,
    tv: Tv,
    electricity: Zap,
    internet: Internet,
    water: Droplet,
  };
  const colorMap: Record<string, string> = {
    airtime: 'bg-orange-500',
    data: 'bg-blue-500',
    tv: 'bg-purple-500',
    electricity: 'bg-yellow-500',
    internet: 'bg-green-500',
    water: 'bg-cyan-500',
  };
  const pathMap: Record<string, string> = {
    airtime: '/bills/airtime',
    data: '/bills/data',
    tv: '/bills/tv',
    electricity: '/bills/electricity',
  };

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
          {categories.map((category) => {
            const Icon = iconMap[category.code] || Phone;
            const path = pathMap[category.code] || '#';
            const comingSoon = !pathMap[category.code];
            return (
            <Link
              key={category.code}
              to={comingSoon ? '#' : path}
              className={`bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-lg flex items-center gap-4 ${
                comingSoon
                  ? 'opacity-60 cursor-not-allowed'
                  : 'hover:shadow-xl transition-shadow'
              }`}
              onClick={(e) => comingSoon && e.preventDefault()}
            >
              <div className={`${colorMap[category.code] || 'bg-gray-500'} w-14 h-14 rounded-2xl flex items-center justify-center shadow-md`}>
                <Icon size={28} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {category.name}
                  {comingSoon && (
                    <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                      Coming Soon
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{category.description}</p>
              </div>
              {!comingSoon && (
                <ChevronRight size={20} className="text-gray-400" />
              )}
            </Link>
          )})}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
