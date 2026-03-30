import { Link } from 'react-router';
import { ChevronLeft, User, Building2, Smartphone } from 'lucide-react';
import BottomNav from '../components/BottomNav';

export default function SendMoney() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-24 rounded-b-[24px]">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/dashboard" className="text-white">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-white">Send Money</h1>
        </div>
      </div>

      <div className="px-6 -mt-16">
        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 p-4 rounded-2xl text-sm mb-6">
          Transfers are monitored for fraud. Keep your transaction PIN secure and verify recipients.
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 space-y-4">
          <Link
            to="/send/swift-pay"
            className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="w-12 h-12 bg-[#f1f5f9] dark:bg-gray-800 rounded-full flex items-center justify-center">
              <User className="text-[#235697]" size={24} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-white">Swift Pay User</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Send to a Swift Pay User or invite phone contact
              </p>
            </div>
            <ChevronLeft size={20} className="rotate-180 text-gray-400" />
          </Link>

          <div className="flex items-center gap-3 py-3">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-sm text-gray-400">OR</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          <Link
            to="/send/bank"
            className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="w-12 h-12 bg-[#f1f5f9] dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Building2 className="text-[#235697]" size={24} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-white">Bank Account</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Send to a bank account</p>
            </div>
            <ChevronLeft size={20} className="rotate-180 text-gray-400" />
          </Link>

          <Link
            to="/send/enaira"
            className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="w-12 h-12 bg-[#f1f5f9] dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Smartphone className="text-[#235697]" size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900 dark:text-white">eNaira</p>
                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                  Coming Soon
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Send to eNaira account</p>
            </div>
            <ChevronLeft size={20} className="rotate-180 text-gray-400" />
          </Link>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
