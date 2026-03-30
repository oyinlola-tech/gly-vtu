import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { billsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import PINInput from '../components/PINInput';
import LoadingSpinner from '../components/LoadingSpinner';
import BottomNav from '../components/BottomNav';
import type { BillProvider, BillVariation } from '../../types/bills';

export default function PayElectricity() {
  const navigate = useNavigate();
  const { verifyPin } = useAuth();
  const [providers, setProviders] = useState<BillProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [meterNumber, setMeterNumber] = useState('');
  const [meterType, setMeterType] = useState('prepaid');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'card'>('wallet');
  const [loading, setLoading] = useState(false);
  const [showPINInput, setShowPINInput] = useState(false);
  const [error, setError] = useState('');
  const [variations, setVariations] = useState<BillVariation[]>([]);
  const [variationCode, setVariationCode] = useState('');

  const getProviderInitials = (name: string) =>
    name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 3)
      .toUpperCase();

  useEffect(() => {
    billsAPI
      .getProviders('electricity')
      .then((data) => setProviders(data || []))
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!selectedProvider) return;
    setVariationCode('');
    billsAPI
      .getVariations(selectedProvider)
      .then((data) => {
        const list = (data?.variations || []) as BillVariation[];
        setVariations(list);
        const auto = list.find((v: BillVariation) =>
          String(v.variation_code || '').toLowerCase().includes(meterType)
        );
        if (auto) {
          setVariationCode(auto.variation_code ?? '');
          if (auto.variation_amount) setAmount(String(auto.variation_amount));
        }
      })
      .catch(() => setVariations([]));
  }, [selectedProvider, meterType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod === 'card') {
      handleCardPayment();
      return;
    }
    setShowPINInput(true);
  };

  const handleCardPayment = async () => {
    setLoading(true);
    try {
      const response = await billsAPI.payWithCard({
        providerCode: selectedProvider,
        amount: parseFloat(amount),
        account: meterNumber,
        variationCode: variationCode || undefined,
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
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
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm text-[#7d7c93] dark:text-gray-400 mb-3">
              Select Provider
            </label>
            <div className="grid grid-cols-3 gap-3">
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
            <input
              type="text"
              value={meterNumber}
              onChange={(e) => setMeterNumber(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[#373f46] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
              placeholder="Enter meter number"
              required
            />
          </div>

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
                disabled={variations.length > 0}
                className="w-full pl-8 pr-4 py-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[#373f46] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                placeholder="0.00"
                required
              />
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {variations.length === 0 &&
                ['1000', '2000', '5000', '10000'].map((preset) => (
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

          {variations.length > 0 && (
            <div>
              <label className="block text-sm text-[#7d7c93] dark:text-gray-400 mb-2">
                Select Tariff
              </label>
              <select
                value={variationCode}
                onChange={(e) => {
                  const code = e.target.value;
                  setVariationCode(code);
                  const selected = variations.find((v) => v.variation_code === code);
                  if (selected?.variation_amount) setAmount(String(selected.variation_amount));
                }}
                className="w-full px-4 py-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[#373f46] dark:text-white"
                required
              >
                <option value="">Select tariff</option>
                {variations.map((plan) => (
                  <option key={plan.variation_code} value={plan.variation_code}>
                    {plan.name} {plan.variation_amount ? `- ₦${plan.variation_amount}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm text-[#7d7c93] dark:text-gray-400 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('wallet')}
                className={`py-3 rounded-lg font-semibold transition-all ${
                  paymentMethod === 'wallet'
                    ? 'bg-[#235697] text-white'
                    : 'bg-white dark:bg-gray-900 text-[#3a3c4c] dark:text-white border border-gray-200 dark:border-gray-700'
                }`}
              >
                Wallet Balance
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`py-3 rounded-lg font-semibold transition-all ${
                  paymentMethod === 'card'
                    ? 'bg-[#235697] text-white'
                    : 'bg-white dark:bg-gray-900 text-[#3a3c4c] dark:text-white border border-gray-200 dark:border-gray-700'
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
            disabled={!selectedProvider || !meterNumber || !amount || loading}
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
                account: meterNumber,
                pin,
                variationCode: variationCode || undefined,
                phone: meterNumber,
              });
              navigate('/transaction-success', {
                state: {
                  transaction: response,
                  amount: parseFloat(amount),
                  recipientName: meterNumber,
                  recipientBank: 'Electricity',
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
