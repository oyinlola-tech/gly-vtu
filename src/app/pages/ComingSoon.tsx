import { Link } from 'react-router';
import { ChevronLeft, Clock } from 'lucide-react';
import BottomNav from '../components/BottomNav';

export default function ComingSoon({
  title,
  description,
  backTo = '/send',
}: {
  title: string;
  description?: string;
  backTo?: string;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-20 rounded-b-[24px]">
        <div className="flex items-center gap-4 mb-6">
          <Link to={backTo} className="text-white">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-white">{title}</h1>
        </div>
      </div>

      <div className="px-6 -mt-12">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-xl text-center">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={28} className="text-[#235697]" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Coming Soon</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {description || `We're working on ${title}. You'll be notified once it goes live.`}
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
