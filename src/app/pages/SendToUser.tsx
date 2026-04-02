import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { walletAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import PINInput from '../components/PINInput';
import LoadingSpinner from '../components/LoadingSpinner';
import CurrencyInput from '../components/CurrencyInput';
import Breadcrumbs from '../components/Breadcrumbs';
import type { RecipientLookupResponse } from '../../types/api';

export default function SendToUser() {
  const navigate = useNavigate();
  const { verifyPin } = useAuth();
  const [formData, setFormData] = useState({
    recipient: '',
    amount: 0,
    narration: '',
  });
  const [showPINInput, setShowPINInput] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmCountdown, setConfirmCountdown] = useState(10);
  const [pendingPin, setPendingPin] = useState<string | null>(null);
  const [recipientLookup, setRecipientLookup] = useState<RecipientLookupResponse['recipient'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLookupLoading(true);
    setRecipientLookup(null);
    try {
      const lookup = await walletAPI.lookupRecipient(formData.recipient.trim());
      if (!lookup.found || !lookup.recipient?.hasFlutterwaveAccount) {
        setError('Recipient not found or not eligible for internal transfer.');
        return;
      }
      setRecipientLookup(lookup.recipient);
      setShowPINInput(true);
    } catch {
      setError('Unable to verify recipient. Please try again.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handlePINVerified = async (pin: string) => {
    setPendingPin(pin);
    setShowPINInput(false);
    setConfirmCountdown(10);
    setShowConfirm(true);
  };

  const handleConfirmSend = async () => {
    if (!pendingPin) return;
    setLoading(true);
    const isValid = await verifyPin(pendingPin);
    if (!isValid) {
      setError('Invalid PIN');
      setLoading(false);
      setShowConfirm(false);
      setPendingPin(null);
      return;
    }

    try {
      const response = await walletAPI.sendMoney({
        amount: Number(formData.amount || 0),
        to: formData.recipient,
        pin: pendingPin,
        channel: 'internal',
      });
      navigate('/transaction-success', {
        state: {
          transaction: response,
          amount: Number(formData.amount || 0),
          recipientName: formData.recipient,
          recipientBank: 'GLY VTU',
        },
      });
    } catch {
      setError('Transfer failed');
    } finally {
      setLoading(false);
      setShowConfirm(false);
      setPendingPin(null);
    }
  };

  useEffect(() => {
    if (!showConfirm) return;
    if (confirmCountdown <= 0) return;
    const timer = setTimeout(() => {
      setConfirmCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [showConfirm, confirmCountdown]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-24 rounded-b-[24px]">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/send" className="text-white" aria-label="Back to send options">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-white">Send to GLY VTU User</h1>
        </div>
        <div className="text-white/80 text-xs">
          <Breadcrumbs items={[{ label: 'Send', href: '/send' }, { label: 'GLY VTU User' }]} />
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
            <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 p-3 rounded-xl text-xs">
              Double-check recipient details. Duplicate transfers are common - confirm before sending.
            </div>

            <div>
              <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recipient (Email or Phone)
              </label>
              <input
                id="recipient"
                type="text"
                value={formData.recipient}
                onChange={(e) => {
                  setFormData({ ...formData, recipient: e.target.value });
                  setRecipientLookup(null);
                }}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                placeholder="user@example.com"
                required
              />
              {lookupLoading && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Verifying recipient...</p>
              )}
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount
              </label>
              <CurrencyInput
                value={formData.amount}
                onChange={(value) => setFormData({ ...formData, amount: value })}
                inputId="amount"
                ariaLabel="Amount"
              />
            </div>

            <div>
              <label htmlFor="narration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Narration (Optional)
              </label>
              <input
                id="narration"
                type="text"
                value={formData.narration}
                onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                placeholder="What's this for?"
              />
            </div>

            <button
              type="submit"
              disabled={loading || lookupLoading}
              className="w-full bg-gradient-to-r from-[#235697] to-[#114280] text-white py-4 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading || lookupLoading ? <LoadingSpinner size="sm" /> : 'Continue'}
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

      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50">
          <div className="w-full bg-white dark:bg-gray-900 rounded-t-3xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Confirm Transfer
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Please confirm you want to send to{' '}
              <span className="font-semibold">
                {recipientLookup?.fullName ||
                  recipientLookup?.emailMasked ||
                  recipientLookup?.phoneMasked ||
                  formData.recipient}
              </span>
              . This helps prevent duplicate transfers.
            </p>
            <div className="flex items-center justify-between mb-4 text-sm text-gray-500 dark:text-gray-400">
              <span>Amount</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                NGN {Number(formData.amount || 0).toLocaleString('en-NG')}
              </span>
            </div>
            {recipientLookup?.bankName && (
              <div className="flex items-center justify-between mb-4 text-sm text-gray-500 dark:text-gray-400">
                <span>Bank</span>
                <span className="font-semibold text-gray-900 dark:text-white">{recipientLookup.bankName}</span>
              </div>
            )}
            <button
              onClick={handleConfirmSend}
              disabled={confirmCountdown > 0 || loading}
              className="w-full bg-gradient-to-r from-[#235697] to-[#114280] text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {confirmCountdown > 0
                ? `Confirm in ${confirmCountdown}s`
                : loading
                  ? 'Sending...'
                  : 'Confirm & Send'}
            </button>
            <button
              onClick={() => {
                setShowConfirm(false);
                setPendingPin(null);
              }}
              className="w-full mt-3 text-sm text-gray-500 dark:text-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
