import { Link } from 'react-router';
import { ChevronLeft, AlertCircle } from 'lucide-react';
import BottomNav from '../components/BottomNav';

export default function Disputes() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-24 rounded-b-[24px]">
        <div className="flex items-center gap-4">
          <Link to="/compliance" className="text-white">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-white">Disputes & Chargebacks</h1>
        </div>
      </div>

      <div className="px-6 -mt-16 space-y-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={18} className="text-[#235697]" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Report an Issue</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            If you believe a transaction or top-up is incorrect, submit a dispute and our team will review it.
          </p>
          <Link
            to="/help"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#235697]"
          >
            Contact Support
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">What to Include</h2>
          <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
            <li>Transaction reference and date</li>
            <li>Amount and channel used (bank, card, bills)</li>
            <li>Screenshot or receipt if available</li>
          </ul>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

