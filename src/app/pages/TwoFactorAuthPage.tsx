import { useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle, Copy, Eye, EyeOff, Smartphone, RefreshCw } from 'lucide-react';
import { authAPI } from '../../services/api';

interface TwoFactorSetupState {
  showSetup: boolean;
  secret?: string;
  qrCode?: string;
  verified: boolean;
  backupCodes?: string[];
}

export function TwoFactorAuthPage() {
  const [state, setState] = useState<TwoFactorSetupState>({
    showSetup: false,
    verified: false,
  });
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTwoFactorStatus();
  }, []);

  async function loadTwoFactorStatus() {
    try {
      const profile = await authAPI.getProfile?.();
      setTwoFactorEnabled(profile?.totp_enabled || false);
    } catch (err) {
      console.error('Failed to load 2FA status', err);
    }
  }

  async function handleStartSetup() {
    try {
      setLoading(true);
      setError(null);
      const setupData = await authAPI.initiateTwoFactor?.();
      setState({
        showSetup: true,
        secret: setupData.secret,
        qrCode: setupData.qrCode,
        verified: false,
      });
    } catch (err) {
      setError('Failed to initiate 2FA setup');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    try {
      setLoading(true);
      setError(null);
      if (!code || code.length !== 6) {
        setError('Please enter a 6-digit code');
        return;
      }

      const result = await authAPI.verifyTwoFactor?.(code, state.secret!);
      setState(prev => ({
        ...prev,
        verified: true,
        backupCodes: result.backupCodes,
      }));
      setSuccess('2FA verification successful!');
      codeInputRef.current?.blur();
    } catch (err: any) {
      setError(err.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmSetup() {
    try {
      setLoading(true);
      setError(null);
      await authAPI.enable2FA?.(state.secret!, code);
      setTwoFactorEnabled(true);
      setState({ showSetup: false, verified: false });
      setCode('');
      setSuccess('Two-factor authentication enabled!');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError('Failed to enable 2FA');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable2FA() {
    if (!window.confirm('Are you sure you want to disable 2FA? Your account will be less secure.')) return;

    try {
      setLoading(true);
      setError(null);
      await authAPI.disable2FA?.();
      setTwoFactorEnabled(false);
      setSuccess('Two-factor authentication disabled');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError('Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  }

  function copyBackupCode(code: string, index: number) {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  if (state.showSetup && !state.verified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Smartphone className="text-blue-600" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Set Up Two-Factor Authentication</h1>
                <p className="text-gray-600">Scan QR code with Google Authenticator or Authy</p>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                <span className="text-red-800">{error}</span>
              </div>
            )}

            <div className="space-y-6">
              {/* QR Code */}
              {state.qrCode && (
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                    <img src={state.qrCode} alt="2FA QR Code" className="w-48 h-48" />
                  </div>
                </div>
              )}

              {/* Manual Entry */}
              <div>
                <p className="text-sm text-gray-600 mb-3">Can't scan? Enter this code manually:</p>
                <div className="bg-gray-100 p-4 rounded-lg font-mono text-center text-lg tracking-widest text-gray-900">
                  {state.secret}
                </div>
              </div>

              {/* Verification Code Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Enter verification code from your authenticator app
                </label>
                <input
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, ''));
                    setError(null);
                  }}
                  placeholder="000000"
                  className="w-full px-4 py-3 text-center text-2xl font-mono border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none tracking-widest"
                />
              </div>

              <button
                onClick={handleVerifyCode}
                disabled={loading || code.length !== 6}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-semibold"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              <p className="text-center text-sm text-gray-600">
                This authentication method uses time-based tokens. Keep your time synchronized.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.verified && state.backupCodes) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="flex items-center gap-3 mb-8 text-green-600">
              <CheckCircle size={32} />
              <h1 className="text-2xl font-bold">Backup Codes Generated</h1>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
              <p className="text-yellow-800 text-sm">
                <strong>Important:</strong> Save these backup codes in a secure location. Each code can be used once if you lose access to your authenticator app.
              </p>
            </div>

            {/* Backup Codes */}
            <div className="space-y-3 mb-8">
              {state.backupCodes.map((backupCode, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200"
                >
                  <code className="font-mono font-semibold text-gray-900">{backupCode}</code>
                  <button
                    onClick={() => copyBackupCode(backupCode, idx)}
                    className={`p-2 rounded transition ${
                      copiedIndex === idx
                        ? 'bg-green-200 text-green-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <Copy size={18} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleConfirmSetup}
              disabled={loading}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition font-semibold"
            >
              {loading ? 'Confirming...' : 'Confirm & Activate 2FA'}
            </button>

            <p className="text-center text-sm text-gray-600 mt-4">
              You will be prompted for a code from your authenticator app on next login.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Two-Factor Authentication</h1>
        <p className="text-gray-600 mt-1">Add an extra layer of security to your account</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
          <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
          <span className="text-green-800">{success}</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Status Card */}
        <div className={`rounded-lg p-6 mb-8 ${twoFactorEnabled ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50 border-2 border-gray-200'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${twoFactorEnabled ? 'bg-green-200' : 'bg-gray-200'}`}>
                <Smartphone className={twoFactorEnabled ? 'text-green-600' : 'text-gray-600'} size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {twoFactorEnabled ? 'Two-Factor Authentication Enabled' : 'Two-Factor Authentication Disabled'}
                </h3>
                <p className={`text-sm mt-1 ${twoFactorEnabled ? 'text-green-700' : 'text-gray-600'}`}>
                  {twoFactorEnabled
                    ? 'Your account is protected with an authenticator app'
                    : 'Protect your account with a second verification method'}
                </p>
              </div>
            </div>
            {twoFactorEnabled && <CheckCircle className="text-green-600" size={28} />}
          </div>
        </div>

        {/* Information Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-blue-900 mb-3">How it works</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex gap-2">
              <span className="font-bold">1.</span>
              <span>Download an authenticator app (Google Authenticator, Authy, Microsoft Authenticator)</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">2.</span>
              <span>Scan the QR code or enter the code manually</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">3.</span>
              <span>Save your backup codes in a secure location</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">4.</span>
              <span>Enter a verification code to confirm setup</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        {!twoFactorEnabled ? (
          <button
            onClick={handleStartSetup}
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-semibold text-lg"
          >
            {loading ? 'Setting up...' : 'Enable Two-Factor Authentication'}
          </button>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-3">
                Your authenticator app is configured. You can disable it if you no longer want to use two-factor authentication.
              </p>
            </div>
            <button
              onClick={handleDisable2FA}
              disabled={loading}
              className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition font-semibold"
            >
              {loading ? 'Disabling...' : 'Disable Two-Factor Authentication'}
            </button>
          </div>
        )}

        {/* Security Tips */}
        <div className="mt-8 border-t pt-6">
          <h3 className="font-semibold text-gray-900 mb-3">Security Tips</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• Keep your backup codes safe - store them offline or in a secure password manager</li>
            <li>• Don't share your authenticator app with anyone</li>
            <li>• If you lose access to your authenticator, use a backup code to regain access</li>
            <li>• Enable 2FA on all important accounts, not just this one</li>
            <li>• Use a strong, unique password in combination with 2FA</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
