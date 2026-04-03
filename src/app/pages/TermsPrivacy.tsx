import { Link } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import BottomNav from '../components/BottomNav';

export default function TermsPrivacy() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-24 rounded-b-[24px]">
        <div className="flex items-center gap-4">
          <Link to="/more" className="text-white">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-white">Terms & Privacy</h1>
        </div>
      </div>

      <div className="px-6 -mt-16 space-y-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Terms of Service</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            By using GLY VTU, you agree to comply with our usage policies, transaction limits, and
            verification requirements. Please review the full terms on our website.
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Privacy Policy</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            We protect your personal data and only use it to deliver services, comply with
            regulations, and improve your experience. We never sell your data to third parties.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
