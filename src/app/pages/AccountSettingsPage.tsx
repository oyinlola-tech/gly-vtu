import React, { useState, useEffect } from 'react';
import { Edit2, Save, X, AlertCircle, CheckCircle, Phone, Mail, User } from 'lucide-react';
import { userAPI } from '../../services/api';
import PhoneInput from '../components/PhoneInput';

interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  accountNumber?: string;
  bankName?: string;
  kycLevel: number;
  kycStatus: string;
  createdAt: string;
  lastActivityAt: string;
}

export function AccountSettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', phone: '' });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      const data = await userAPI.getProfile();
      setProfile({
        id: data.id,
        fullName: data.full_name,
        email: data.email,
        phone: data.phone,
        accountNumber: data.account_number,
        bankName: data.bank_name,
        kycLevel: data.kyc_level,
        kycStatus: data.kyc_status,
        createdAt: data.created_at,
        lastActivityAt: data.last_activity_at,
      });
      setFormData({ fullName: data.full_name, phone: data.phone });
      setError(null);
    } catch (err) {
      setError('Failed to load profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      await userAPI.updateProfile(formData);
      setProfile(prev => prev ? { ...prev, fullName: formData.fullName, phone: formData.phone } : null);
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Account Settings</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
          <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
          <p className="text-green-800">Profile updated successfully</p>
        </div>
      )}

      {profile && (
        <div className="space-y-6">
          {/* Personal Information Card */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-blue-600 hover:text-blue-700 flex items-center gap-2 text-sm font-semibold"
                >
                  <Edit2 size={18} />
                  Edit
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label htmlFor="settingsFullName" className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    id="settingsFullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="settingsPhone" className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <PhoneInput
                    value={formData.phone}
                    onChange={(value) => setFormData({ ...formData, phone: value })}
                    inputId="settingsPhone"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                  >
                    <X size={18} className="inline mr-2" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    <Save size={18} className="inline mr-2" />
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User size={20} className="text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Full Name</p>
                    <p className="font-semibold text-gray-900">{profile.fullName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail size={20} className="text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Email Address</p>
                    <p className="font-semibold text-gray-900">{profile.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone size={20} className="text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Phone Number</p>
                    <p className="font-semibold text-gray-900">{profile.phone}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Account Status */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Account Status</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">KYC Level</p>
                <p className="text-2xl font-bold text-blue-600">{profile.kycLevel}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {profile.kycStatus === 'approved' ? '✓ Verified' : profile.kycStatus === 'pending' ? '⏳ Pending' : '✗ Not Verified'}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Account Created</p>
                <p className="text-lg font-semibold text-gray-900">{new Date(profile.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Settings Options */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Settings</h2>
            <div className="space-y-3">
              <a href="/security/password" className="block p-4 border rounded-lg hover:bg-gray-50 transition">
                <h3 className="font-semibold text-gray-900">Change Password</h3>
                <p className="text-sm text-gray-600">Update your password</p>
              </a>
              <a href="/security/dashboard" className="block p-4 border rounded-lg hover:bg-gray-50 transition">
                <h3 className="font-semibold text-gray-900">Security Settings</h3>
                <p className="text-sm text-gray-600">Manage 2FA, devices, and security events</p>
              </a>
              <a href="/settings/devices" className="block p-4 border rounded-lg hover:bg-gray-50 transition">
                <h3 className="font-semibold text-gray-900">Manage Devices</h3>
                <p className="text-sm text-gray-600">View and revoke active sessions</p>
              </a>
              <a href="/account/data-export" className="block p-4 border rounded-lg hover:bg-gray-50 transition">
                <h3 className="font-semibold text-gray-900">Export Data</h3>
                <p className="text-sm text-gray-600">Request a GDPR data export</p>
              </a>
            </div>
          </div>

          {/* Account Closure */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-900 mb-2">Danger Zone</h2>
            <p className="text-sm text-red-800 mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <a href="/account/closure" className="inline-flex px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
              Delete Account
            </a>
            <a
              href="/account/closure/cancel"
              className="ml-3 inline-flex px-4 py-2 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 transition"
            >
              Cancel Deletion
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
