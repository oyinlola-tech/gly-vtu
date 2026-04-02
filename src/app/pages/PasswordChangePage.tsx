import React, { useMemo, useState, useEffect } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { authAPI } from '../../services/api';

export function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState<{ current?: boolean; new?: boolean; confirm?: boolean }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const passwordRequirements = useMemo(() => [
    { min: 8, check: newPassword.length >= 8, label: 'At least 8 characters' },
    { min: 1, check: /[A-Z]/.test(newPassword), label: 'One uppercase letter' },
    { min: 1, check: /[a-z]/.test(newPassword), label: 'One lowercase letter' },
    { min: 1, check: /[0-9]/.test(newPassword), label: 'One number' },
    { min: 1, check: /[!@#$%^&*()_+\-=[\]{};"':\\|,.<>/?]/.test(newPassword), label: 'One special character' },
  ], [newPassword]);

  const meetsAllRequirements = passwordRequirements.every(req => req.check);

  useEffect(() => {
    const strengthCount = passwordRequirements.filter(req => req.check).length;
    setPasswordStrength((strengthCount / passwordRequirements.length) * 100);
  }, [passwordRequirements]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!meetsAllRequirements) {
      setError('Password does not meet security requirements');
      return;
    }

    try {
      setLoading(true);
      await authAPI.changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Lock size={24} />
          Change Password
        </h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
            <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
            <p className="text-green-800">Password changed successfully</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Current Password */}
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-semibold text-gray-700 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                id="currentPassword"
                type={showPasswords.current ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                aria-label={showPasswords.current ? 'Hide current password' : 'Show current password'}
              >
                {showPasswords.current ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showPasswords.new ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                aria-label={showPasswords.new ? 'Hide new password' : 'Show new password'}
              >
                {showPasswords.new ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Password Strength Meter */}
            <div className="mt-3">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs text-gray-600">Password Strength</p>
                <span className={`text-xs font-semibold ${
                  passwordStrength >= 80 ? 'text-green-600' : 
                  passwordStrength >= 60 ? 'text-yellow-600' : 
                  'text-red-600'
                }`}>
                  {passwordStrength >= 80 ? 'Strong' : passwordStrength >= 60 ? 'Medium' : 'Weak'}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    passwordStrength >= 80 ? 'bg-green-600' : 
                    passwordStrength >= 60 ? 'bg-yellow-500' : 
                    'bg-red-600'
                  }`}
                  style={{ width: `${passwordStrength}%` }}
                />
              </div>
            </div>

            {/* Password Requirements */}
            <div className="mt-3 space-y-2">
              {passwordRequirements.map((req, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                    req.check ? 'bg-green-600' : 'bg-gray-300'
                  }`}>
                    {req.check ? '✓' : '○'}
                  </div>
                  <span className={req.check ? 'text-green-700' : 'text-gray-600'}>
                    {req.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showPasswords.confirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                aria-label={showPasswords.confirm ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showPasswords.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !currentPassword || !newPassword || !confirmPassword || !meetsAllRequirements}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Changing Password...' : 'Change Password'}
          </button>
        </form>

        {/* Security Tips */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Security Tips</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>✓ Use a unique password not used elsewhere</li>
            <li>✓ Avoid personal information in your password</li>
            <li>✓ Change password regularly (every 3 months recommended)</li>
            <li>✓ Never share your password with anyone</li>
            <li>✓ Use a password manager to generate strong passwords</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
