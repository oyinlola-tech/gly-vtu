import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Wallet, Plus, Eye, EyeOff, TrendingUp, Send } from 'lucide-react';
import { userAPI } from '../../services/api';
import PageShell from '../components/layout/PageShell';
import SectionCard from '../components/layout/SectionCard';

interface WalletInfo {
  balance: number;
  currency: string;
  lastUpdated?: string;
  accountNumber?: string;
  bankCode?: string;
}

interface TopupOption {
  id: string;
  provider?: string;
  minAmount?: number;
  maxAmount?: number;
  fee?: number;
  processingTime?: string;
  name?: string;
  amount?: number;
  currency?: string;
}

export function WalletManagementPage() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [topupOptions, setTopupOptions] = useState<TopupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  async function loadWalletData() {
    try {
      setLoading(true);
      const walletData = await userAPI.getWalletInfo?.();
      setWallet(walletData);

      const options = await userAPI.getTopupOptions?.();
      setTopupOptions(options || []);
      
      setError(null);
    } catch (err) {
      setError('Failed to load wallet information');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleTopup() {
    try {
      setTopupLoading(true);
      const amount = parseFloat(topupAmount);

      if (!amount || amount <= 0) {
        setError('Please enter a valid amount');
        return;
      }

      const option = topupOptions.find(o => o.id === selectedOption);
      if (!option || !selectedOption) {
        setError('Please select a topup method');
        return;
      }

      const minAmount = option.minAmount ?? option.amount ?? 0;
      const maxAmount = option.maxAmount ?? option.amount ?? Number.MAX_SAFE_INTEGER;
      if (amount < minAmount || amount > maxAmount) {
        setError(`Amount must be between ${minAmount} and ${maxAmount}`);
        return;
      }

      await userAPI.initiateTopup(selectedOption, amount);
      setTopupAmount('');
      setSelectedOption(null);
      await loadWalletData();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to initiate topup');
    } finally {
      setTopupLoading(false);
    }
  }

  if (loading && !wallet) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <PageShell className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Wallet Management</h1>
        <p className="text-gray-600 mt-1">View balance and manage your wallet funds</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Wallet Balance Card */}
      {wallet && (
        <div className="mb-8 fintech-hero rounded-2xl p-8 text-white">
          <div className="flex items-start justify-between mb-12">
            <div className="flex items-center gap-3">
              <Wallet size={32} />
              <div>
                <p className="text-blue-200 text-sm">Wallet Balance</p>
                <div className="flex items-center gap-2 mt-1">
                  {showBalance ? (
                    <h2 className="text-4xl font-bold">
                      {wallet.currency} {wallet.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h2>
                  ) : (
                    <div className="w-32 h-10 bg-blue-500 rounded animate-pulse" />
                  )}
                  <button
                    onClick={() => setShowBalance(!showBalance)}
                    className="p-2 hover:bg-blue-500 rounded-lg transition"
                  >
                    {showBalance ? <Eye size={20} /> : <EyeOff size={20} />}
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => window.location.href = '/send-money'}
              className="flex items-center gap-2 px-4 py-2 btn-secondary rounded-xl"
            >
              <Send size={18} />
              Send Money
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 border-t border-blue-500">
            <div>
              <p className="text-blue-200 text-xs">Account Number</p>
              <p className="font-mono font-semibold">{wallet.accountNumber || 'N/A'}</p>
            </div>
            <div>
              <p className="text-blue-200 text-xs">Bank Code</p>
              <p className="font-mono font-semibold">{wallet.bankCode || 'N/A'}</p>
            </div>
            <div>
              <p className="text-blue-200 text-xs">Last Updated</p>
              <p className="text-sm">
                {new Date(wallet.lastUpdated || new Date().toISOString()).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <SectionCard className="rounded-2xl p-6 border-l-4 border-emerald-500">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-semibold">Available Balance</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {wallet?.currency} {Math.floor(wallet?.balance || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <SectionCard className="rounded-2xl p-6 border-l-4 border-blue-500">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Wallet className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-semibold">Account Type</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">Individual</p>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Topup Section */}
      <SectionCard className="rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Plus className="text-blue-600" size={28} />
          Add Funds to Wallet
        </h2>

        {/* Topup Methods */}
        <div className="space-y-4 mb-6">
          <label className="block text-sm font-medium text-gray-700">Select Topup Method</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {topupOptions.map((option) => {
              const minAmount = option.minAmount ?? option.amount ?? 0;
              const maxAmount = option.maxAmount ?? option.amount ?? 0;
              const providerLabel = option.provider || option.name || 'Topup';
              const feeRate = option.fee ?? 0;
              const processingTime = option.processingTime || 'Instant';
              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedOption(option.id)}
                  className={`p-4 rounded-2xl border-2 transition text-left ${
                    selectedOption === option.id
                      ? 'border-[#235697] bg-blue-50/80'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{providerLabel}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        NGN {minAmount.toLocaleString()} - {maxAmount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">Fee: {feeRate.toFixed(1)}%</p>
                      <p className="text-xs text-gray-500">Processing: {processingTime}</p>
                    </div>
                    {selectedOption === option.id && (
                      <CheckCircle className="text-blue-600" size={20} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {selectedOption && (
          <>
            {/* Amount Input */}
            <div className="mb-6">
              <label htmlFor="topupAmount" className="block text-sm font-medium text-gray-700 mb-3">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-gray-600 font-semibold">NGN</span>
                <input
                  id="topupAmount"
                  type="number"
                  value={topupAmount}
                  onChange={(e) => {
                    setTopupAmount(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter amount"
                  className="w-full pl-16 pr-4 py-3 fintech-input"
                />
              </div>
            </div>

            {/* Fee Calculation */}
            {topupAmount && selectedOption && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount</span>
                    <span className="font-semibold text-gray-900">NGN {parseFloat(topupAmount || '0').toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fee</span>
                    <span className="font-semibold text-gray-900">
                      NGN {((parseFloat(topupAmount || '0') * (topupOptions.find(o => o.id === selectedOption)?.fee || 0)) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-lg text-blue-600">
                      NGN {(parseFloat(topupAmount || '0') + ((parseFloat(topupAmount || '0') * (topupOptions.find(o => o.id === selectedOption)?.fee || 0)) / 100)).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={handleTopup}
              disabled={topupLoading || !topupAmount}
              className="w-full px-6 py-3 btn-primary rounded-2xl disabled:opacity-50 transition font-semibold text-lg"
            >
              {topupLoading ? 'Processing...' : 'Proceed to Payment'}
            </button>
          </>
        )}

        {/* Security Notice */}
        <div className="mt-8 pt-6 border-t">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Secure:</strong> All transactions are encrypted and protected. Your payment information is never stored on our servers.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <SectionCard className="mt-8 rounded-2xl p-6">
        <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="/transactions"
            className="px-4 py-3 btn-secondary rounded-lg text-center"
          >
            View Transactions
          </a>
          <a
            href="/security"
            className="px-4 py-3 btn-secondary rounded-lg text-center"
          >
            Security Settings
          </a>
        </SectionCard>
      </SectionCard>
      </SectionCard>
    </PageShell>
  );
}
