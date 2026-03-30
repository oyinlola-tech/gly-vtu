import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, ChevronDown } from 'lucide-react';
import { TransactionLoader } from '../components/LoadingSpinner';
import BottomNav from '../components/BottomNav';

const providers = [
  { id: 'dstv', name: 'DSTV', logo: '📺' },
  { id: 'gotv', name: 'GOtv', logo: '📺' },
  { id: 'startimes', name: 'Startimes', logo: '📺' },
  { id: 'showmax', name: 'Showmax', logo: '🎬' },
];

const packages: any = {
  dstv: [
    { id: '1', name: 'DStv Premium', price: '24,500' },
    { id: '2', name: 'DStv Compact Plus', price: '16,600' },
    { id: '3', name: 'DStv Compact', price: '10,500' },
    { id: '4', name: 'DStv Confam', price: '6,200' },
  ],
  gotv: [
    { id: '1', name: 'GOtv Supa', price: '6,400' },
    { id: '2', name: 'GOtv Max', price: '4,850' },
    { id: '3', name: 'GOtv Jolli', price: '3,300' },
  ],
};

export default function PayTV() {
  const navigate = useNavigate();
  const [selectedProvider, setSelectedProvider] = useState('');
  const [smartCardNumber, setSmartCardNumber] = useState('');
  const [selectedPackage, setSelectedPackage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPackages, setShowPackages] = useState(false);

  const currentPackages = selectedProvider ? packages[selectedProvider] || packages.dstv : packages.dstv;
  const selectedPackageData = currentPackages.find((p: any) => p.id === selectedPackage);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setLoading(false);
    navigate('/transaction-success', {
      state: {
        type: 'TV Subscription',
        amount: selectedPackageData?.price,
        recipient: smartCardNumber,
        plan: selectedPackageData?.name,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      {loading && <TransactionLoader />}

      <div className="bg-gradient-to-br from-[#235697] to-[#114280] rounded-b-[24px] p-6">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => navigate(-1)} className="text-white">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-white">Pay TV Subscription</h1>
        </div>
      </div>

      <div className="px-6 mt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm text-[#7d7c93] dark:text-gray-400 mb-3">
              Select Provider
            </label>
            <div className="grid grid-cols-4 gap-3">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => {
                    setSelectedProvider(provider.id);
                    setSelectedPackage('');
                  }}
                  className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all ${
                    selectedProvider === provider.id
                      ? 'bg-[#235697] text-white shadow-lg'
                      : 'bg-white dark:bg-gray-900 text-[#3a3c4c] dark:text-white'
                  }`}
                >
                  <span className="text-2xl">{provider.logo}</span>
                  <span className="text-xs font-semibold">{provider.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#7d7c93] dark:text-gray-400 mb-2">
              Smart Card Number / IUC Number
            </label>
            <input
              type="text"
              value={smartCardNumber}
              onChange={(e) => setSmartCardNumber(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[#373f46] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
              placeholder="Enter smart card number"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[#7d7c93] dark:text-gray-400 mb-2">
              Select Package
            </label>
            <button
              type="button"
              onClick={() => setShowPackages(!showPackages)}
              className="w-full px-4 py-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[#373f46] dark:text-white flex items-center justify-between"
            >
              <span>{selectedPackageData?.name || 'Choose a package'}</span>
              <ChevronDown className={`transition-transform ${showPackages ? 'rotate-180' : ''}`} size={20} />
            </button>

            {showPackages && (
              <div className="mt-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {currentPackages.map((pkg: any) => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => {
                      setSelectedPackage(pkg.id);
                      setShowPackages(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700 last:border-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[#3a3c4c] dark:text-white font-medium">{pkg.name}</span>
                      <span className="text-[#235697] font-semibold">₦{pkg.price}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedPackageData && (
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-[#7d7c93] dark:text-gray-400">Amount to pay</span>
                <span className="text-2xl font-bold text-[#235697]">₦{selectedPackageData.price}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!selectedProvider || !smartCardNumber || !selectedPackage}
            className="w-full bg-gradient-to-r from-[#235697] to-[#114280] text-white py-4 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Continue
          </button>
        </form>
      </div>

      <BottomNav />
    </div>
  );
}
