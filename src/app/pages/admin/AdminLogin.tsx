import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAdminAuth();
  const [formData, setFormData] = useState({ email: '', password: '', totp: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totpRequired, setTotpRequired] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await login(formData.email, formData.password, formData.totp || undefined);
      if (response?.totpRequired) {
        setTotpRequired(true);
        setError('Enter your authenticator code to continue.');
        return;
      }
      navigate('/admin');
    } catch (err) {
      const message = (err as Error)?.message || 'Login failed';
      if (message === 'TOTP_REQUIRED') {
        setTotpRequired(true);
        setError('Enter your authenticator code to continue.');
      } else {
        setError('Invalid admin credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Admin Login</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Sign in as an admin or super admin to manage GLY VTU.
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              id="adminEmail"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
              placeholder="admin@glyvtu.ng"
              required
            />
          </div>
          <div>
            <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <input
              id="adminPassword"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
              placeholder="Enter your password"
              required
            />
          </div>
          {totpRequired && (
            <div>
              <label htmlFor="adminTotp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Authenticator Code
              </label>
              <input
                id="adminTotp"
                type="text"
                value={formData.totp}
                onChange={(e) => setFormData({ ...formData, totp: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                placeholder="6-digit code"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#235697] to-[#114280] text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Forgot your password?{' '}
          <Link to="/admin/forgot-password" className="text-[#235697] font-semibold">
            Reset it
          </Link>
        </p>
      </div>
    </div>
  );
}
