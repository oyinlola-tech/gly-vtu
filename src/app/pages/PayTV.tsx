import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { billsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import PINInput from '../components/PINInput';
import LoadingSpinner from '../components/LoadingSpinner';
import BottomNav from '../components/BottomNav';

export default function PayTV() {
  const navigate = useNavigate();
  const { verifyPin } = useAuth();
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [smartCardNumber, setSmartCardNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPINInput, setShowPINInput] = useState(false);
  const [error, setError] = useState('');

  const getProviderInitials = (name: string) =>
    name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 3)
      .toUpperCase();

  useEffect(() => {
    billsAPI
      .getProviders('tv')
      .then((data) => setProviders(data || []))
      .catch(() => null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowPINInput(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
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
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm text-[#7d7c93] dark:text-gray-400 mb-3">
              Select Provider
            </label>
            <div className="grid grid-cols-4 gap-3">
              {providers.map((provider) => (
                <button
                  key={provider.code}
                  type="button"
                  onClick={() => {
                    setSelectedProvider(provider.code);
                  }}
                  className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all ${
                    selectedProvider === provider.code
                      ? 'bg-[#235697] text-white shadow-lg'
                      : 'bg-white dark:bg-gray-900 text-[#3a3c4c] dark:text-white'
                  }`}
                >
                  <div className="relative w-10 h-10 rounded-full bg-white/80 flex items-center justify-center text-xs font-semibold text-[#235697]">
                    {getProviderInitials(provider.name || '---')}
                    {provider.logo_url && (
                      <img
                        src={provider.logo_url}
                        alt={provider.name}
                        className="absolute inset-0 w-full h-full object-contain rounded-full"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                  </div>
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
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[#373f46] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                placeholder="Enter amount"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!selectedProvider || !smartCardNumber || !amount || loading}
            className="w-full bg-gradient-to-r from-[#235697] to-[#114280] text-white py-4 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Continue'}
          </button>
        </form>
      </div>

      {showPINInput && (
        <PINInput
          onComplete={async (pin) => {
            setLoading(true);
            const valid = await verifyPin(pin);
            if (!valid) {
              setError('Invalid PIN');
              setLoading(false);
              setShowPINInput(false);
              return;
            }
            try {
              const response = await billsAPI.pay({
                providerCode: selectedProvider,
                amount: parseFloat(amount),
                account: smartCardNumber,
                pin,
              });
              navigate('/transaction-success', {
                state: {
                  transaction: response,
                  amount: parseFloat(amount),
                  recipientName: smartCardNumber,
                  recipientBank: 'TV Subscription',
                },
              });
            } catch (err) {
              setError('Transaction failed');
            } finally {
              setLoading(false);
              setShowPINInput(false);
            }
          }}
          onCancel={() => setShowPINInput(false)}
          error={error}
        />
      )}

      <BottomNav />
    </div>
  );
}
