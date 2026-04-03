import { Link } from 'react-router';
import { ChevronLeft, FileText, AlertTriangle } from 'lucide-react';
import BottomNav from '../components/BottomNav';

export default function CompliancePolicies() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-24 rounded-b-[24px]">
        <div className="flex items-center gap-4">
          <Link to="/more" className="text-white">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-white">Compliance & Policies</h1>
        </div>
      </div>

      <div className="px-6 -mt-16 space-y-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={18} className="text-[#235697]" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Privacy Policy</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            We process your data to provide services, comply with regulations, and protect your account.
            Sensitive data is handled securely and never sold.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={18} className="text-[#235697]" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Terms of Service</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            By using GLY VTU, you agree to our service terms, KYC requirements, and transaction limits.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-[#235697]" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Acceptable Use Policy</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            GLY VTU prohibits fraud, chargeback abuse, or attempts to bypass verification.
            Accounts violating this policy may be suspended.
          </p>
        </div>

        <Link
          to="/disputes"
          className="block bg-white dark:bg-gray-900 rounded-2xl p-6 shadow text-sm font-semibold text-[#235697]"
        >
          Disputes & Chargebacks
        </Link>
      </div>

      <BottomNav />
    </div>
  );
}

