import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { authAPI, userAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import OTPInput from '../components/OTPInput';

export default function VerifyDevice() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshProfile } = useAuth();
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [totpRequired, setTotpRequired] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!email) return;
    authAPI
      .getSecurityQuestion(email)
      .then((res) => setQuestion(res?.question || null))
      .catch(() => null);
  }, [email]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await authAPI.verifyDevice({
        email,
        code: code || undefined,
        securityAnswer: answer || undefined,
        totp: totpCode || undefined,
        backupCode: backupCode || undefined,
      });
      if (response?.totpRequired) {
        setTotpRequired(true);
        setError('Enter your authenticator code to continue.');
        return;
      }
      await refreshProfile();
      const security = await userAPI.getSecurityStatus().catch(() => null);
      if (security && !security.pinSet) {
        navigate('/set-pin');
        return;
      }
      navigate('/dashboard');
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Verify Device</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Enter the OTP sent to your email or answer your security question.
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label htmlFor="verifyEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              id="verifyEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
              required
            />
          </div>

          <div>
            <label id="verifyOtpLabel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              OTP Code
            </label>
            <div className="flex justify-center" role="group" aria-labelledby="verifyOtpLabel">
              <OTPInput value={code} onChange={setCode} autoFocus />
            </div>
          </div>

          {question && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Security Question
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{question}</p>
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                placeholder="Answer"
              />
            </div>
          )}

          {totpRequired && (
            <div className="space-y-3">
              <div>
                <label id="verifyTotpLabel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Authenticator Code
                </label>
                <div className="flex justify-center" role="group" aria-labelledby="verifyTotpLabel">
                  <OTPInput value={totpCode} onChange={setTotpCode} />
                </div>
              </div>
              <div>
                <label htmlFor="backupCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Backup Code (optional)
                </label>
                <input
                  id="backupCode"
                  type="text"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value.trim())}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                  placeholder="Use if you lost access"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (!code && !answer && !totpCode && !backupCode)}
            className="w-full bg-gradient-to-r from-[#235697] to-[#114280] text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Verify'}
          </button>
        </form>
      </div>
    </div>
  );
}
