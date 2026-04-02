import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import OTPInput from '../components/OTPInput';
import { Eye, EyeOff } from 'lucide-react';
import { tokenStore } from '../../services/api';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [totpCode, setTotpCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [totpRequired, setTotpRequired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const registered = location.state?.registered;
  const [recentDevices, setRecentDevices] = useState<{ label: string; lastLoginAt: string }[]>([]);
  const [lastLoginHint, setLastLoginHint] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('login_hints');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentDevices(parsed.slice(0, 3));
        }
      } catch {
        // ignore
      }
    }
    const deviceId = tokenStore.getDeviceId();
    const last = localStorage.getItem(`last_login_${deviceId}`);
    if (last) {
      setLastLoginHint(last);
    }
  }, []);

  const buildDeviceLabel = () => {
    const ua = navigator.userAgent || '';
    const isMobile = /Mobi|Android/i.test(ua);
    const isTablet = /Tablet|iPad/i.test(ua);
    const type = isTablet ? 'Tablet' : isMobile ? 'Mobile' : 'Desktop';
    let browser = 'Browser';
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';
    return `${browser} · ${type}`;
  };

  const persistLoginHint = () => {
    const deviceId = tokenStore.getDeviceId();
    const label = buildDeviceLabel();
    const lastLoginAt = new Date().toISOString();
    localStorage.setItem(`last_login_${deviceId}`, lastLoginAt);
    const stored = localStorage.getItem('login_hints');
    type LoginHint = { label: string; lastLoginAt: string };
    const list: unknown = stored ? JSON.parse(stored) : [];
    const filtered = Array.isArray(list)
      ? (list as LoginHint[]).filter((item) => item.label !== label)
      : [];
    const next: LoginHint[] = [{ label, lastLoginAt }, ...filtered].slice(0, 3);
    localStorage.setItem('login_hints', JSON.stringify(next));
    setRecentDevices(next);
    setLastLoginHint(lastLoginAt);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password, totpCode || undefined, backupCode || undefined);
      if (result?.otpRequired) {
        navigate('/verify-device', { state: { email: formData.email } });
        return;
      }
      if (result?.totpRequired) {
        setTotpRequired(true);
        setError('Enter your authenticator code to continue.');
        return;
      }
      if (result?.needsPin) {
        navigate('/set-pin');
        return;
      }
      persistLoginHint();
      navigate('/dashboard');
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-br from-[#235697] to-[#114280] rounded-3xl flex items-center justify-center mx-auto mb-6">
              <img
                src="/assets/logo/gly-vtu.png"
                alt="GLY VTU logo"
                className="w-12 h-12 object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome Back</h1>
            <p className="text-gray-500 dark:text-gray-400">Sign in to continue to GLY VTU</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {registered && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-4 rounded-xl text-sm"
              >
                Account created. Please sign in to continue.
              </motion.div>
            )}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm"
              >
                {error}
              </motion.div>
            )}

            <div>
              <label htmlFor="loginEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                id="loginEmail"
                type="text"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label htmlFor="loginPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="loginPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {totpRequired && (
              <div className="space-y-3">
                <div>
                  <label id="loginTotpLabel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Authenticator Code
                  </label>
                  <div className="flex justify-center" role="group" aria-labelledby="loginTotpLabel">
                    <OTPInput value={totpCode} onChange={setTotpCode} />
                  </div>
                </div>
                <div>
                  <label htmlFor="loginBackupCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Backup Code (optional)
                  </label>
                  <input
                    id="loginBackupCode"
                    type="text"
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value.trim())}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                    placeholder="Use if you lost access"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-gray-600 dark:text-gray-400">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-[#235697] font-medium">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#235697] to-[#114280] text-white py-4 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-[#235697] font-semibold">
              Sign Up
            </Link>
          </p>

          <div className="mt-6 space-y-3">
            {lastLoginHint && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-xs text-gray-600 dark:text-gray-300">
                Last login on this device: {new Date(lastLoginHint).toLocaleString()}
              </div>
            )}
            {recentDevices.length > 0 && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Recent devices</p>
                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                  {recentDevices.map((device) => (
                    <div key={`${device.label}-${device.lastLoginAt}`} className="flex items-center justify-between">
                      <span>{device.label}</span>
                      <span>{new Date(device.lastLoginAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="text-center p-6 text-xs text-gray-500 dark:text-gray-600">
        <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
      </div>
    </div>
  );
}
