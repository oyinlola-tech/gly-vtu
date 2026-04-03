import { Link } from 'react-router';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import BottomNav from '../components/BottomNav';

const tips = [
  'Never share your OTP or PIN with anyone.',
  'Use a strong password and update it regularly.',
  'Enable a security question for extra protection.',
  'Verify recipients before sending money.',
  'Only install the official GLY VTU app.',
];

export default function SecurityTips() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-24 rounded-b-[24px]">
        <div className="flex items-center gap-4">
          <Link to="/more" className="text-white">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-white">Security Tips</h1>
        </div>
      </div>

      <div className="px-6 -mt-16 space-y-3">
        {tips.map((tip) => (
          <div key={tip} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow flex items-start gap-3">
            <ShieldCheck size={18} className="text-[#235697] mt-1" />
            <p className="text-sm text-gray-600 dark:text-gray-300">{tip}</p>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
