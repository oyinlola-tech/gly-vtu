import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { CheckCircle, Copy, Download, Lock, ShieldCheck } from 'lucide-react';
import { userAPI } from '../../services/api';

type Step = 'intro' | 'scan' | 'verify' | 'backup' | 'done';

export default function TwoFactorSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('intro');
  const [secret, setSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [token, setToken] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await userAPI.setupTotp();
      setSecret(res.secret || '');
      setQrCode(res.qrCode || '');
      setStep('scan');
    } catch {
      setError('Unable to start 2FA setup.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await userAPI.enableTotp(token);
      setBackupCodes(res.backupCodes || []);
      setStep('backup');
    } catch {
      setError('Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const content = backupCodes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'glyvtu-backup-codes.txt';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-10">
        <div className="flex items-center gap-4">
          <Link to="/security-center" className="text-white">
            ←
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Two-Factor Setup</h1>
            <p className="text-white/70 text-sm">Secure your account with 2FA</p>
          </div>
        </div>
      </div>

      <div className="px-6 -mt-8 pb-24">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 space-y-6">
          {step === 'intro' && (
            <>
              <div className="flex items-center gap-2 text-[#235697]">
                <ShieldCheck size={20} />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Enable Two-Factor Authentication
                </h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add an extra layer of security by requiring a code from your authenticator app.
              </p>
              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
                  {error}
                </div>
              )}
              <button
                onClick={handleStart}
                disabled={loading}
                className="w-full bg-[#235697] text-white py-3 rounded-xl font-semibold"
              >
                {loading ? 'Starting...' : 'Start Setup'}
              </button>
            </>
          )}

          {step === 'scan' && (
            <>
              <div className="flex items-center gap-2 text-[#235697]">
                <Lock size={20} />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Scan QR Code</h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Open your authenticator app and scan the QR code below.
              </p>
              {qrCode ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-white p-3 rounded-xl border border-gray-200">
                    <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                  </div>
                  <div className="w-full">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Can’t scan? Enter this code manually:
                    </p>
                    <button
                      onClick={() => navigator.clipboard.writeText(secret)}
                      className="w-full text-left font-mono text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 inline-flex items-center justify-between"
                    >
                      {secret || '—'}
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              ) : null}
              <button
                onClick={() => setStep('verify')}
                className="w-full bg-[#235697] text-white py-3 rounded-xl font-semibold"
              >
                I’ve Scanned the Code
              </button>
            </>
          )}

          {step === 'verify' && (
            <>
              <div className="flex items-center gap-2 text-[#235697]">
                <Lock size={20} />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Verify Code</h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enter the 6-digit code from your authenticator app.
              </p>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697] text-center tracking-widest"
                placeholder="000000"
              />
              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
                  {error}
                </div>
              )}
              <button
                onClick={handleVerify}
                disabled={token.length !== 6 || loading}
                className="w-full bg-[#235697] text-white py-3 rounded-xl font-semibold disabled:opacity-60"
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
            </>
          )}

          {step === 'backup' && (
            <>
              <div className="flex items-center gap-2 text-[#235697]">
                <ShieldCheck size={20} />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Backup Codes</h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Save these codes somewhere safe. They can be used if you lose access to your phone.
              </p>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 font-mono text-xs space-y-2">
                {backupCodes.map((code) => (
                  <div key={code}>{code}</div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={downloadBackupCodes}
                  className="flex-1 border border-gray-200 dark:border-gray-700 py-3 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2"
                >
                  <Download size={14} />
                  Download
                </button>
                <button
                  onClick={() => setStep('done')}
                  className="flex-1 bg-[#235697] text-white py-3 rounded-xl text-sm font-semibold"
                >
                  I’ve Saved Them
                </button>
              </div>
            </>
          )}

          {step === 'done' && (
            <div className="text-center space-y-4">
              <CheckCircle size={40} className="text-green-600 mx-auto" />
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">2FA Enabled</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your account is now protected with two-factor authentication.
                </p>
              </div>
              <button
                onClick={() => navigate('/security-center')}
                className="w-full bg-[#235697] text-white py-3 rounded-xl font-semibold"
              >
                Return to Security Center
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
