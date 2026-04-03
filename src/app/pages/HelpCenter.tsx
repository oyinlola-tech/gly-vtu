import { Link } from 'react-router';
import { ChevronLeft, Mail, PhoneCall, MessageCircle } from 'lucide-react';
import BottomNav from '../components/BottomNav';

export default function HelpCenter() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-24 rounded-b-[24px]">
        <div className="flex items-center gap-4">
          <Link to="/more" className="text-white">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-white">Help Center</h1>
        </div>
      </div>

      <div className="px-6 -mt-16 space-y-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Need help?</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Reach out to our support team for account issues, failed transfers, or KYC assistance.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow flex items-center gap-3">
            <MessageCircle size={20} className="text-[#235697]" />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Live Chat</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Available 24/7 inside the app</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow flex items-center gap-3">
            <Mail size={20} className="text-[#235697]" />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Email</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">support@glyvtu.ng</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow flex items-center gap-3">
            <PhoneCall size={20} className="text-[#235697]" />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Phone</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">+234 700 000 0000</p>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
