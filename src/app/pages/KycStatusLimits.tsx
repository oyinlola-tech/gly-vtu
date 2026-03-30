import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, Shield } from 'lucide-react';
import { userAPI } from '../../services/api';
import BottomNav from '../components/BottomNav';

export default function KycStatusLimits() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userAPI
      .getKycLimits()
      .then((res) => setData(res))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const formatLimit = (value: number | null | undefined) => {
    if (!value) return 'Not set';
    return `₦${Number(value).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-24 rounded-b-[24px]">
        <div className="flex items-center gap-4">
          <Link to="/more" className="text-white">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-white">KYC Status & Limits</h1>
        </div>
      </div>

      <div className="px-6 -mt-16 space-y-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} className="text-[#235697]" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Current Tier</h2>
          </div>
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading KYC status...</p>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Level</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  Level {data?.level || 1}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {data?.status || 'pending'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Transaction Limits</h2>
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading limits...</p>
          ) : (
            <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
              {['send', 'bill', 'topup'].map((type) => (
                <div key={type} className="border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                    {type} limits
                  </p>
                  <div className="flex items-center justify-between">
                    <span>Daily</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatLimit(data?.limits?.[type]?.daily)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span>Monthly</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatLimit(data?.limits?.[type]?.monthly)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

