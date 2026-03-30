import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { billsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import PINInput from '../components/PINInput';
import LoadingSpinner from '../components/LoadingSpinner';
import BottomNav from '../components/BottomNav';

export default function BuyData() {
  const navigate = useNavigate();
  const { verifyPin } = useAuth();
  const [providers, setProviders] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    network: '',
    phone: '',
    amount: '',
  });
  const [showPINInput, setShowPINInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getProviderInitials = (name: string) =>
    name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 3)
      .toUpperCase();

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const response = await billsAPI.getProviders('data');
      setProviders(response || []);
    } catch (err) {
      console.error('Failed to load providers');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowPINInput(true);
  };

  const handlePINVerified = async (pin: string) => {
    setLoading(true);

    const isValid = await verifyPin(pin);
    if (!isValid) {
      setError('Invalid PIN');
      setLoading(false);
      setShowPINInput(false);
      return;
    }

    try {
      const response = await billsAPI.pay({
        providerCode: formData.network,
        amount: parseFloat(formData.amount),
        account: formData.phone,
        pin,
      });

      navigate('/transaction-success', {
        state: {
          transaction: response,
          amount: parseFloat(formData.amount),
          recipientName: formData.phone,
          recipientBank: `${formData.network} Data`,
        },
      });
    } catch (err) {
      setError('Transaction failed');
    } finally {
      setLoading(false);
      setShowPINInput(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-24 rounded-b-[24px]">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-white">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-white">Buy Data Bundle</h1>
        </div>
      </div>

      <div className="px-6 -mt-16 pb-8">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Select Network
              </label>
              <div className="grid grid-cols-4 gap-3">
                {providers.map((provider) => (
                  <button
                    key={provider.code}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, network: provider.code })
                    }
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      formData.network === provider.code
                        ? 'border-[#235697] bg-[#235697]/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="relative w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-300">
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
                    <span className="text-xs font-medium text-gray-900 dark:text-white">
                      {provider.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                placeholder="080 0000 0000"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                  placeholder="Enter amount"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !formData.network}
              className="w-full bg-gradient-to-r from-[#235697] to-[#114280] text-white py-4 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Continue'}
            </button>
          </form>
        </div>
      </div>

      {showPINInput && (
        <PINInput
          onComplete={handlePINVerified}
          onCancel={() => setShowPINInput(false)}
          error={error}
        />
      )}

      <BottomNav />
    </div>
  );
}
