import { useState } from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

export default function AccountClosure() {
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmitClosure = async () => {
    if (!confirmed || !reason) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/app/api/user/account/closure-request', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          feedbackMessage: 'Account closure requested',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(
          `Account closure requested. Scheduled deletion: ${new Date(
            data.deletionDate
          ).toLocaleDateString()}. Check your email for confirmation.`
        );
        navigate('/dashboard');
        return;
      }
      const err = await res.json().catch(() => null);
      toast.error(err?.error || 'Failed to submit closure request');
    } catch {
      toast.error('Failed to submit closure request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-6">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-red-700 mb-4"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {step === 1 && (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="flex items-center gap-4 mb-6">
              <AlertTriangle className="text-red-600" size={32} />
              <h1 className="text-3xl font-bold text-red-600">Delete Your Account</h1>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
              <h2 className="font-semibold text-red-900 mb-4">Important Information</h2>
              <ul className="space-y-3 text-red-800 text-sm">
                <li>✓ Your account and all data will be permanently deleted</li>
                <li>✓ You have 30 days from the request date to cancel</li>
                <li>✓ Transactions and payment history will be archived for compliance</li>
                <li>✓ Wallet balance will be refunded to your registered bank account</li>
                <li>✓ Active subscriptions will be cancelled</li>
              </ul>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setStep(2)}
                className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 font-semibold"
              >
                Continue to Delete Account
              </button>
              <button
                onClick={() => navigate(-1)}
                className="w-full border border-gray-300 py-3 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-lg shadow p-8">
            <h1 className="text-2xl font-bold mb-6">Why are you leaving?</h1>
            <p className="text-gray-600 mb-6">Help us improve (required)</p>

            <div className="space-y-3 mb-8">
              {[
                'Security concerns',
                'Found a better alternative',
                'No longer need the service',
                'Privacy concerns',
                'Poor customer service',
                'Other',
              ].map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={option}
                    checked={reason === option}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setStep(3)}
                disabled={!reason}
                className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Continue
              </button>
              <button
                onClick={() => setStep(1)}
                className="w-full border border-gray-300 py-3 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white rounded-lg shadow p-8">
            <h1 className="text-2xl font-bold mb-6 text-red-600">Confirm Account Deletion</h1>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
              <p className="text-yellow-900 font-semibold mb-2">You have 30 days to change your mind</p>
              <p className="text-yellow-800 text-sm">
                After submitting this request, you'll have 30 days to cancel it. After 30 days, your account and all data will be permanently deleted.
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="w-4 h-4"
                />
                <span>I understand and want to permanently delete my account</span>
              </label>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleSubmitClosure}
                disabled={!confirmed || isLoading}
                className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Delete My Account'}
              </button>
              <button
                onClick={() => setStep(2)}
                className="w-full border border-gray-300 py-3 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
