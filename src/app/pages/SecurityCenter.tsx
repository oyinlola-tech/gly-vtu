import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, ShieldCheck, Laptop, Trash2, KeyRound } from 'lucide-react';
import { userAPI } from '../../services/api';
import BottomNav from '../components/BottomNav';
import LoadingSpinner from '../components/LoadingSpinner';

export default function SecurityCenter() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [message, setMessage] = useState('');

  const loadSessions = async () => {
    setLoading(true);
    try {
      const rows = await userAPI.getSessions();
      setSessions(rows || []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const revokeSession = async (id: string) => {
    try {
      await userAPI.revokeSession(id);
      setMessage('Session revoked.');
      await loadSessions();
    } catch {
      setMessage('Unable to revoke session.');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      await userAPI.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '' });
      setMessage('Password updated successfully.');
    } catch (err) {
      setMessage('Unable to update password.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-24 rounded-b-[24px]">
        <div className="flex items-center gap-4">
          <Link to="/more" className="text-white">
            <ChevronLeft size={24} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Security Center</h1>
            <p className="text-white/70 text-sm">Manage sessions and security controls</p>
          </div>
        </div>
      </div>

      <div className="px-6 -mt-16 space-y-6">
        {message && (
          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-xl text-sm">
            {message}
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={18} className="text-[#235697]" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Active Sessions</h2>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <LoadingSpinner size="sm" /> Loading sessions...
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No sessions found.</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                      <Laptop size={18} className="text-[#235697]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {session.label || session.device_id}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Last seen: {session.last_seen ? new Date(session.last_seen).toLocaleString() : 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {session.ip_address || 'IP unknown'} · {session.user_agent || 'Device'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => revokeSession(session.id)}
                    className="text-xs text-red-600 font-semibold flex items-center gap-1"
                  >
                    <Trash2 size={14} />
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound size={18} className="text-[#235697]" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Change Password</h2>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <input
              type="password"
              placeholder="Current password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
              }
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              required
            />
            <input
              type="password"
              placeholder="New password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
              }
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              required
            />
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#235697] to-[#114280] text-white py-3 rounded-xl font-semibold hover:opacity-90"
            >
              Update Password
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Quick Security Actions</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Configure your transaction PIN and security question.
          </p>
          <Link
            to="/security"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#235697]"
          >
            Manage PIN & Security Question
          </Link>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

