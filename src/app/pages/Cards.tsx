import { Link } from 'react-router';
import { ChevronLeft, CreditCard, Plus, Lock, MoreVertical } from 'lucide-react';
import BottomNav from '../components/BottomNav';

export default function Cards() {
  const cardFeatures = [
    {
      icon: Lock,
      title: 'Secure Payments',
      description: 'Protected by advanced encryption',
    },
    {
      icon: CreditCard,
      title: 'Virtual Card',
      description: 'Create unlimited virtual cards',
    },
    {
      icon: Eye,
      title: 'Full Control',
      description: 'Freeze, unfreeze or delete anytime',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-32 rounded-b-[24px]">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-white">
              <ChevronLeft size={24} />
            </Link>
            <h1 className="text-xl font-bold text-white">My Cards</h1>
          </div>
          <button className="text-white">
            <MoreVertical size={24} />
          </button>
        </div>
      </div>

      <div className="px-6 -mt-24">
        {/* Empty State */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-2xl mb-6 text-center">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard size={28} className="text-[#235697]" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            No virtual cards yet
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create a virtual card to start online payments and subscriptions.
          </p>
        </div>

        {/* Card Actions */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow flex flex-col items-center gap-2 opacity-60 cursor-not-allowed">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <Lock size={24} className="text-blue-600" />
            </div>
            <span className="text-xs font-medium text-gray-900 dark:text-white">Freeze</span>
          </button>

          <button className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow flex flex-col items-center gap-2 opacity-60 cursor-not-allowed">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <Plus size={24} className="text-green-600" />
            </div>
            <span className="text-xs font-medium text-gray-900 dark:text-white">Top Up</span>
          </button>

          <button className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow flex flex-col items-center gap-2 opacity-60 cursor-not-allowed">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
              <CreditCard size={24} className="text-purple-600" />
            </div>
            <span className="text-xs font-medium text-gray-900 dark:text-white">Details</span>
          </button>
        </div>

        {/* Features */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Card Features</h2>
          <div className="space-y-3">
            {cardFeatures.map((feature) => (
              <div
                key={feature.title}
                className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-[#235697] to-[#114280] rounded-xl flex items-center justify-center">
                  <feature.icon size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Create New Card */}
        <button className="w-full bg-gradient-to-r from-[#235697] to-[#114280] text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity mb-6">
          <Plus size={20} />
          <span>Create New Virtual Card</span>
        </button>

        {/* Coming Soon Section */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-3xl p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#235697] to-[#114280] rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard size={40} className="text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Physical Cards</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Order a physical debit card delivered to your doorstep
          </p>
          <div className="inline-block bg-gradient-to-r from-[#235697] to-[#114280] text-white px-6 py-2 rounded-full text-sm font-semibold">
            Coming Soon
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
