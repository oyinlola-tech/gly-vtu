import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '../components/Breadcrumbs';

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

export default function AccountClosureCancel() {
  const navigate = useNavigate();
  const query = useQuery();
  const [token, setToken] = useState(query.get('token') || '');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const incoming = query.get('token');
    if (incoming) {
      setToken(incoming);
      handleCancel(incoming);
    }
  }, []);

  const handleCancel = async (override?: string) => {
    const cancelToken = (override ?? token).trim();
    if (!cancelToken) {
      setMessage('A cancellation token is required.');
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch(`/app/api/user/account/closure/cancel?token=${encodeURIComponent(cancelToken)}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Unable to cancel request');
      }
      setStatus('success');
      setMessage('Your account closure request has been cancelled.');
      toast.success('Account closure cancelled');
    } catch (err: any) {
      setStatus('error');
      setMessage(err?.message || 'Unable to cancel request');
    }
  };

  const handleCancelAuthenticated = async () => {
    setStatus('loading');
    try {
      const res = await fetch('/app/api/user/account/closure-cancel', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Unable to cancel request');
      }
      setStatus('success');
      setMessage('Your account closure request has been cancelled.');
      toast.success('Account closure cancelled');
    } catch (err: any) {
      setStatus('error');
      setMessage(err?.message || 'Unable to cancel request');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-950 dark:to-gray-900 p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <Breadcrumbs items={[{ label: 'Account', href: '/dashboard' }, { label: 'Cancel Closure' }]} />
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Cancel Account Closure</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Enter your cancellation token or use your account to stop the deletion request.
          </p>

          <div className="space-y-4">
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter cancellation token"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
            />
            <button
              onClick={() => handleCancel()}
              disabled={status === 'loading'}
              className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold"
            >
              {status === 'loading' ? 'Cancelling...' : 'Cancel Closure Request'}
            </button>
            <button
              onClick={handleCancelAuthenticated}
              disabled={status === 'loading'}
              className="w-full border border-gray-200 dark:border-gray-700 py-3 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200"
            >
              Cancel using my logged-in session
            </button>
          </div>

          {message && (
            <div className={`mt-6 p-4 rounded-xl border ${
              status === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : status === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-yellow-50 border-yellow-200 text-yellow-800'
            }`}>
              <div className="flex items-start gap-3">
                {status === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                <p className="text-sm">{message}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
