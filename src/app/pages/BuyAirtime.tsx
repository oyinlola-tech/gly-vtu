import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { billsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import PINInput from '../components/PINInput';
import LoadingSpinner from '../components/LoadingSpinner';
import BottomNav from '../components/BottomNav';

export default function BuyAirtime() {
  const navigate = useNavigate();
  const { verifyPin } = useAuth();
  const [providers, setProviders] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    network: '',
    phone: '',
    amount: '',
    paymentMethod: 'wallet',
  });
  const [manualNetwork, setManualNetwork] = useState(false);
  const [showPINInput, setShowPINInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProviders();
  }, []);

  const detectNetwork = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 4) return '';
    const prefix4 = digits.slice(0, 4);
    const prefix3 = digits.slice(0, 3);
    const prefix5 = digits.slice(0, 5);
    const mtn = new Set([
      '0703','0704','0706','0803','0806','0810','0813','0814','0816','0903','0906','0913','0916',
      '07025','07026'
    ]);
    const airtel = new Set([
      '0701','0708','0802','0808','0812','0901','0902','0904','0907','0912'
    ]);
    const glo = new Set([
      '0705','0805','0807','0811','0815','0905','0915'
    ]);
    const etisalat = new Set([
      '0809','0817','0818','0908','0909'
    ]);
    if (mtn.has(prefix5) || mtn.has(prefix4) || mtn.has(prefix3)) return 'mtn';
    if (airtel.has(prefix4) || airtel.has(prefix3)) return 'airtel';
    if (glo.has(prefix4) || glo.has(prefix3)) return 'glo';
    if (etisalat.has(prefix4) || etisalat.has(prefix3)) return '9mobile';
    return '';
  };

  useEffect(() => {
    if (manualNetwork) return;
    const detected = detectNetwork(formData.phone);
    if (!detected) return;
    if (formData.network !== detected) {
      setFormData((prev) => ({ ...prev, network: detected }));
    }
  }, [formData.phone, manualNetwork]);

  const providerName =
    providers.find((p) => p.code === formData.network)?.name || formData.network.toUpperCase();

  const loadProviders = async () => {
    try {
      const response = await billsAPI.getProviders('airtime');
      setProviders(response || []);
    } catch (err) {
      console.error('Failed to load providers');
    }
  };

  const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

  const getProviderInitials = (name: string) =>
    name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 3)
      .toUpperCase();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.paymentMethod === 'card') {
      handleCardPayment();
      return;
    }
    setShowPINInput(true);
  };

  const handleCardPayment = async () => {
    setLoading(true);
    try {
      const response = await billsAPI.payWithCard({
        providerCode: formData.network,
        amount: parseFloat(formData.amount),
        account: formData.phone,
      });
      if (response?.checkoutUrl) {
        window.location.href = response.checkoutUrl;
      }
    } catch (err) {
      setError('Card payment failed');
    } finally {
      setLoading(false);
    }
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
          recipientBank: `${formData.network} Airtime`,
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
          <h1 className="text-xl font-bold text-white">Buy Airtime</h1>
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
              {!manualNetwork ? (
                <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                  <div className="relative w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-300">
                    {getProviderInitials(providerName || '---')}
                    {providers.find((p) => p.code === formData.network)?.logo_url && (
                      <img
                        src={providers.find((p) => p.code === formData.network)?.logo_url}
                        alt={providerName}
                        className="absolute inset-0 w-full h-full object-contain rounded-full"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {providerName || 'Detecting network...'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Network detected automatically
                    </p>
                  </div>
                </div>
              ) : (
                <select
                  value={formData.network}
                  onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">Select network</option>
                  {providers.map((provider) => (
                    <option key={provider.code} value={provider.code}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              )}
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
              <label className="mt-3 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={manualNetwork}
                  onChange={(e) => setManualNetwork(e.target.checked)}
                />
                Not your network? Choose manually
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount
              </label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setFormData({ ...formData, amount: amount.toString() })}
                    className={`py-2 px-4 rounded-xl text-sm font-medium transition-colors ${
                      formData.amount === amount.toString()
                        ? 'bg-[#235697] text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    ₦{amount}
                  </button>
                ))}
              </div>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, paymentMethod: 'wallet' })}
                  className={`py-3 rounded-xl text-sm font-semibold border ${
                    formData.paymentMethod === 'wallet'
                      ? 'bg-[#235697] text-white border-[#235697]'
                      : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  Wallet Balance
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, paymentMethod: 'card' })}
                  className={`py-3 rounded-xl text-sm font-semibold border ${
                    formData.paymentMethod === 'card'
                      ? 'bg-[#235697] text-white border-[#235697]'
                      : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  Pay with Card
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Card payments will open a secure checkout page.
              </p>
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
