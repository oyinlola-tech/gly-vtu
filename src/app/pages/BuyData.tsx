import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronLeft, ChevronDown } from 'lucide-react';
import { billsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import PINInput from '../components/PINInput';
import LoadingSpinner from '../components/LoadingSpinner';
import BottomNav from '../components/BottomNav';

export default function BuyData() {
  const navigate = useNavigate();
  const { verifyPin } = useAuth();
  const [providers, setProviders] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    network: '',
    phone: '',
    plan: '',
    planName: '',
    amount: 0,
  });
  const [showPlanSelect, setShowPlanSelect] = useState(false);
  const [showPINInput, setShowPINInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    if (formData.network) {
      loadPlans(formData.network);
    }
  }, [formData.network]);

  const loadProviders = async () => {
    try {
      const response = await billsAPI.getProviders('data');
      setProviders(response.providers);
    } catch (err) {
      console.error('Failed to load providers');
    }
  };

  const loadPlans = async (provider: string) => {
    try {
      const response = await billsAPI.getDataPlans(provider);
      setPlans(response.plans);
    } catch (err) {
      console.error('Failed to load plans');
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
      const response = await billsAPI.buyData({
        network: formData.network,
        phone: formData.phone,
        plan: formData.plan,
        amount: formData.amount,
        pin,
      });

      navigate('/transaction-success', {
        state: {
          transaction: response.transaction,
          recipientName: formData.phone,
          recipientBank: `${formData.network} Data - ${formData.planName}`,
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
                      setFormData({ ...formData, network: provider.code, plan: '', planName: '' })
                    }
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      formData.network === provider.code
                        ? 'border-[#235697] bg-[#235697]/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-3xl">{provider.logo}</span>
                    <span className="text-xs font-medium text-gray-900 dark:text-white">
                      {provider.code}
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
                Data Plan
              </label>
              <button
                type="button"
                onClick={() => setShowPlanSelect(true)}
                disabled={!formData.network}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697] flex items-center justify-between disabled:opacity-50"
              >
                <span>{formData.planName || 'Select data plan'}</span>
                <ChevronDown size={20} />
              </button>
            </div>

            {formData.amount > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Amount to pay</p>
                <p className="text-2xl font-bold text-[#235697]">₦{formData.amount}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !formData.plan}
              className="w-full bg-gradient-to-r from-[#235697] to-[#114280] text-white py-4 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Continue'}
            </button>
          </form>
        </div>
      </div>

      {/* Plan Selection Modal */}
      {showPlanSelect && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Select Plan</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {plans.map((plan) => (
                <button
                  key={plan.code}
                  onClick={() => {
                    setFormData({
                      ...formData,
                      plan: plan.code,
                      planName: plan.name,
                      amount: plan.amount,
                    });
                    setShowPlanSelect(false);
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <span className="font-medium text-gray-900 dark:text-white">{plan.name}</span>
                  <span className="text-[#235697] font-bold">₦{plan.amount}</span>
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowPlanSelect(false)}
                className="w-full py-3 text-gray-600 dark:text-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
