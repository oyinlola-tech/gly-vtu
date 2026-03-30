import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Search } from 'lucide-react';
import { TransactionLoader } from '../components/LoadingSpinner';
import BottomNav from '../components/BottomNav';

const providers = [
  { id: 'ekedc', name: 'EKEDC', logo: '⚡' },
  { id: 'ikedc', name: 'IKEDC', logo: '⚡' },
  { id: 'aedc', name: 'AEDC', logo: '⚡' },
  { id: 'phed', name: 'PHED', logo: '⚡' },
  { id: 'ibedc', name: 'IBEDC', logo: '⚡' },
  { id: 'kedco', name: 'KEDCO', logo: '⚡' },
];

export default function PayElectricity() {
  const navigate = useNavigate();
  const [selectedProvider, setSelectedProvider] = useState('');
  const [meterNumber, setMeterNumber] = useState('');
  const [meterType, setMeterType] = useState('prepaid');
  const [amount, setAmount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (meterNumber && selectedProvider) {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setCustomerName('VICTOR JIMOH');
      setVerified(true);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setLoading(false);
    navigate('/transaction-success', {
      state: {
        type: 'Electricity Payment',
        amount,
        recipient: meterNumber,
        plan: `${selectedProvider.toUpperCase()} - ${meterType}`,
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
          <h1 className="text-xl font-bold text-white">Pay Electricity</h1>
        </div>
      </div>

      <div className="px-6 mt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm text-[#7d7c93] dark:text-gray-400 mb-3">
              Select Provider
            </label>
            <div className="grid grid-cols-3 gap-3">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => {
                    setSelectedProvider(provider.id);
                    setVerified(false);
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
              Meter Type
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMeterType('prepaid')}
                className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                  meterType === 'prepaid'
                    ? 'bg-[#235697] text-white'
                    : 'bg-white dark:bg-gray-900 text-[#3a3c4c] dark:text-white border border-gray-200 dark:border-gray-700'
                }`}
              >
                Prepaid
              </button>
              <button
                type="button"
                onClick={() => setMeterType('postpaid')}
                className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                  meterType === 'postpaid'
                    ? 'bg-[#235697] text-white'
                    : 'bg-white dark:bg-gray-900 text-[#3a3c4c] dark:text-white border border-gray-200 dark:border-gray-700'
                }`}
              >
                Postpaid
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#7d7c93] dark:text-gray-400 mb-2">
              Meter Number
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={meterNumber}
                onChange={(e) => {
                  setMeterNumber(e.target.value);
                  setVerified(false);
                }}
                className="flex-1 px-4 py-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[#373f46] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                placeholder="Enter meter number"
                required
              />
              <button
                type="button"
                onClick={handleVerify}
                disabled={!meterNumber || !selectedProvider}
                className="px-4 py-3 bg-[#235697] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                <Search size={20} />
              </button>
            </div>
          </div>

          {verified && customerName && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <p className="text-sm text-[#7d7c93] dark:text-gray-400 mb-1">Customer Name</p>
              <p className="font-semibold text-[#3a3c4c] dark:text-white">{customerName}</p>
            </div>
          )}

          <div>
            <label className="block text-sm text-[#7d7c93] dark:text-gray-400 mb-2">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7d7c93]">₦</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[#373f46] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                placeholder="0.00"
                required
              />
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {['1000', '2000', '5000', '10000'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className="py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-[#3a3c4c] dark:text-white hover:bg-[#235697] hover:text-white transition-colors"
                >
                  ₦{preset}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!selectedProvider || !meterNumber || !amount || !verified}
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
