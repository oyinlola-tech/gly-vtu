import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { ChevronLeft, ChevronDown, Search } from 'lucide-react';
import { banksAPI, walletAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import PINInput from '../components/PINInput';
import LoadingSpinner from '../components/LoadingSpinner';

export default function SendToBank() {
  const navigate = useNavigate();
  const { verifyPin } = useAuth();
  const [banks, setBanks] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    accountNumber: '',
    bankCode: '',
    bankName: '',
    amount: '',
    narration: '',
  });
  const [accountName, setAccountName] = useState('');
  const [balance, setBalance] = useState(0);
  const [showBankSelect, setShowBankSelect] = useState(false);
  const [showPINInput, setShowPINInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBanks();
    loadBalance();
  }, []);

  const loadBanks = async () => {
    try {
      const response = await banksAPI.getBanks();
      setBanks(response || []);
    } catch (err) {
      console.error('Failed to load banks');
    }
  };

  const loadBalance = async () => {
    try {
      const response = await walletAPI.getBalance();
      setBalance(Number(response?.balance || 0));
    } catch (err) {
      console.error('Failed to load balance');
    }
  };

  const handleResolveAccount = async () => {
    if (formData.accountNumber.length !== 10 || !formData.bankCode) return;

    setVerifying(true);
    setError('');

    try {
      const response = await banksAPI.resolveAccount({
        accountNumber: formData.accountNumber,
        bankCode: formData.bankCode,
      });
      if (!response.found) {
        setError('Account not found');
        setAccountName('');
        return;
      }
      setAccountName(response.accountName || '');
    } catch (err) {
      setError('Unable to verify account');
      setAccountName('');
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (formData.accountNumber.length === 10 && formData.bankCode) {
      handleResolveAccount();
    }
  }, [formData.accountNumber, formData.bankCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName) {
      setError('Please wait for account verification');
      return;
    }
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
      const response = await walletAPI.sendMoney({
        amount: parseFloat(formData.amount),
        accountNumber: formData.accountNumber,
        bankCode: formData.bankCode,
        accountName,
        pin,
        channel: 'bank',
      });

      navigate('/transaction-success', {
        state: {
          transaction: response,
          amount: parseFloat(formData.amount),
          recipientName: accountName,
          recipientBank: formData.bankName,
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-24 rounded-b-[24px]">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/send" className="text-white">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-white">Send to Bank Account</h1>
        </div>

        {/* Balance Card */}
        <div className="bg-[#235697] rounded-2xl p-6 shadow-lg">
          <p className="text-white/80 text-xs mb-2">Total Balance</p>
          <h2 className="text-white text-2xl font-bold">
            ₦{balance.toLocaleString('en-NG', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </h2>
          <p className="text-white/60 text-xs mt-2">Last updated 2 mins ago</p>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Account Number
              </label>
              <input
                type="tel"
                maxLength={10}
                value={formData.accountNumber}
                onChange={(e) =>
                  setFormData({ ...formData, accountNumber: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                placeholder="Enter account number"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bank
              </label>
              <button
                type="button"
                onClick={() => setShowBankSelect(true)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697] flex items-center justify-between"
              >
                <span>{formData.bankName || 'Select bank'}</span>
                <ChevronDown size={20} />
              </button>
            </div>

            {verifying && (
              <div className="flex items-center gap-3 text-[#235697]">
                <LoadingSpinner size="sm" />
                <span className="text-sm">Verifying account...</span>
              </div>
            )}

            {accountName && (
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Beneficiary's name
                </p>
                <p className="font-semibold text-gray-900 dark:text-white">{accountName}</p>
              </div>
            )}

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
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Narration (Optional)
              </label>
              <input
                type="text"
                value={formData.narration}
                onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                placeholder="What's this for?"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !accountName}
              className="w-full bg-gradient-to-r from-[#235697] to-[#114280] text-white py-4 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Continue'}
            </button>
          </form>
        </div>
      </div>

      {/* Bank Selection Modal */}
      {showBankSelect && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Select Bank</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {banks.map((bank) => (
                <button
                  key={bank.code}
                  onClick={() => {
                    setFormData({
                      ...formData,
                      bankCode: bank.code,
                      bankName: bank.name,
                    });
                    setShowBankSelect(false);
                  }}
                  className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
                    {bank.name?.slice(0, 3).toUpperCase()}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">{bank.name}</span>
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowBankSelect(false)}
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
    </div>
  );
}
