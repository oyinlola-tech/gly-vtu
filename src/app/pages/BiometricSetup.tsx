import { useEffect, useState } from 'react';
import { Fingerprint, Check } from 'lucide-react';
import { userAPI } from '../../services/api';
import { toast } from 'sonner';
import Breadcrumbs from '../components/Breadcrumbs';

export default function BiometricSetup() {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [status, setStatus] = useState<'checking' | 'ready' | 'registering' | 'success' | 'error' | 'unsupported'>('checking');

  useEffect(() => {
    const check = async () => {
      if (window.PublicKeyCredential) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setIsSupported(available);
        setStatus(available ? 'ready' : 'unsupported');
      } else {
        setStatus('unsupported');
      }
      try {
        const data = await userAPI.getSecurityStatus?.();
        setIsEnabled(Boolean(data?.biometricEnabled));
      } catch {
        // ignore
      }
    };
    check();
  }, []);

  const handleEnableBiometric = async () => {
    try {
      setStatus('registering');
      await userAPI.toggleBiometric(true);
      setIsEnabled(true);
      setStatus('success');
      toast.success('Biometric login enabled');
    } catch (err: any) {
      setStatus('error');
      toast.error(err?.message || 'Biometric setup failed');
    }
  };

  const handleDisable = async () => {
    try {
      setStatus('registering');
      await userAPI.toggleBiometric(false);
      setIsEnabled(false);
      setStatus('ready');
      toast.success('Biometric login disabled');
    } catch (err: any) {
      setStatus('error');
      toast.error(err?.message || 'Failed to update biometric settings');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-950 dark:to-gray-900 p-6">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-900 rounded-lg shadow p-8">
        <div className="mb-6 text-xs text-gray-500">
          <Breadcrumbs items={[{ label: 'Settings', href: '/more' }, { label: 'Biometric Login' }]} />
        </div>
        <div className="flex items-center gap-4 mb-8">
          <Fingerprint className="text-purple-600" size={40} />
          <div>
            <h1 className="text-3xl font-bold">Biometric Login</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Use fingerprint or face ID where supported</p>
          </div>
        </div>

        {!isSupported ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
            <p className="text-yellow-900 dark:text-yellow-200">
              Your device does not support biometric authentication. Try a device with fingerprint or face recognition.
            </p>
          </div>
        ) : isEnabled ? (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 flex items-center gap-3">
              <Check className="text-green-600" size={24} />
              <div>
                <h3 className="font-semibold text-green-900">Biometric Authentication Enabled</h3>
                <p className="text-green-800 dark:text-green-200 text-sm">You can now login using fingerprint or face</p>
              </div>
            </div>
            <button
              onClick={handleDisable}
              disabled={status === 'registering'}
              className="w-full border border-gray-200 py-3 rounded-lg text-sm font-semibold"
            >
              Disable Biometric Login
            </button>
          </div>
        ) : (
          <button
            onClick={handleEnableBiometric}
            disabled={status === 'registering'}
            className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700"
          >
            {status === 'registering' ? 'Setting up...' : 'Enable Biometric Login'}
          </button>
        )}
      </div>
    </div>
  );
}
