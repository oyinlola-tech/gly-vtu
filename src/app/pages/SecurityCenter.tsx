import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  ChevronLeft,
  ShieldCheck,
  Laptop,
  Trash2,
  KeyRound,
  Shield,
  Activity,
  Download,
  AlertTriangle,
  Lock,
  Clock,
} from 'lucide-react';
import { userAPI, tokenStore } from '../../services/api';
import BottomNav from '../components/BottomNav';

export default function SecurityCenter() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<'devices' | 'security' | 'activity'>('devices');
  const [securityStatus, setSecurityStatus] = useState<any>(null);
  const [disableToken, setDisableToken] = useState('');
  const [disableBackupCode, setDisableBackupCode] = useState('');

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

  const loadEvents = async () => {
    setEventsLoading(true);
    try {
      const rows = await userAPI.getSecurityEvents({ limit: 40 });
      setEvents(rows || []);
    } catch {
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
    loadEvents();
    userAPI.getSecurityStatus().then(setSecurityStatus).catch(() => null);
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
      const msg =
        (err as Error)?.message || 'Unable to update password.';
      setMessage(msg);
    }
  };

  const deviceId = useMemo(() => tokenStore.getDeviceId(), []);
  const enrichedSessions = useMemo(
    () =>
      (sessions || []).map((session) => ({
        ...session,
        isCurrent: session.device_id === deviceId,
      })),
    [sessions, deviceId]
  );

  const handleExport = async () => {
    try {
      const blob = await userAPI.downloadSecurityEvents();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-events-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setMessage('Unable to export security log.');
    }
  };

  const eventTone = (severity: string) => {
    if (severity === 'high') return 'border-red-200 bg-red-50 text-red-700';
    if (severity === 'medium') return 'border-yellow-200 bg-yellow-50 text-yellow-700';
    return 'border-blue-200 bg-blue-50 text-blue-700';
  };

  const formatEventName = (value: string) => {
    if (!value) return 'Security event';
    return value.replace(/\./g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-2">
          <div className="grid grid-cols-3 gap-2 p-2">
            <button
              onClick={() => setTab('devices')}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                tab === 'devices'
                  ? 'bg-[#235697] text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Shield size={16} />
              Devices
            </button>
            <button
              onClick={() => setTab('security')}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                tab === 'security'
                  ? 'bg-[#235697] text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Lock size={16} />
              Security
            </button>
            <button
              onClick={() => setTab('activity')}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                tab === 'activity'
                  ? 'bg-[#235697] text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Activity size={16} />
              Activity
            </button>
          </div>
        </div>

        {tab === 'devices' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={18} className="text-[#235697]" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Active Sessions</h2>
            </div>
            <div className="mb-4 flex justify-end">
              <Link to="/settings/devices" className="text-xs font-semibold text-[#235697]">
                Manage all devices
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl" />
              </div>
            ) : enrichedSessions.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No sessions found.</p>
            ) : (
              <div className="space-y-3">
                {enrichedSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`border rounded-xl p-4 flex items-start justify-between gap-4 ${
                      session.isCurrent
                        ? 'border-green-200 bg-green-50 dark:bg-green-900/10'
                        : 'border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                        <Laptop size={18} className="text-[#235697]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {session.label || session.device_id}
                          </p>
                          {session.isCurrent && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              Current
                            </span>
                          )}
                          {!session.trusted && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                              Untrusted
                            </span>
                          )}
                        </div>
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
                      disabled={session.isCurrent}
                    >
                      <Trash2 size={14} />
                      {session.isCurrent ? 'Current' : 'Revoke'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'security' && (
          <div className="space-y-6">
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
              <div className="flex items-center gap-2 mb-4">
                <Lock size={18} className="text-[#235697]" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Transaction PIN</h2>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Your PIN is required to authorize payments. It must be exactly 6 digits.
              </p>
              <Link
                to="/security"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#235697]"
              >
                Manage PIN & Security Question
              </Link>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lock size={18} className="text-[#235697]" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Two-Factor Authentication</h2>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Add an extra layer of security with a time-based code from your phone.
              </p>
              <div className="flex items-center gap-2 text-xs mb-3">
                <span
                  className={`px-2 py-1 rounded ${
                    securityStatus?.totpEnabled ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {securityStatus?.totpEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              {securityStatus?.totpEnabled ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={disableToken}
                    onChange={(e) => setDisableToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-center tracking-widest"
                    placeholder="Enter 2FA code"
                  />
                  <input
                    type="text"
                    value={disableBackupCode}
                    onChange={(e) => setDisableBackupCode(e.target.value.trim())}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    placeholder="Backup code (optional)"
                  />
                  <button
                    onClick={async () => {
                      try {
                        await userAPI.disableTotp({
                          token: disableToken || undefined,
                          backupCode: disableBackupCode || undefined,
                        });
                        setSecurityStatus((prev: any) => ({ ...prev, totpEnabled: false }));
                        setDisableToken('');
                        setDisableBackupCode('');
                        setMessage('2FA disabled.');
                      } catch {
                        setMessage('Unable to disable 2FA.');
                      }
                    }}
                    className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold"
                  >
                    Disable 2FA
                  </button>
                </div>
              ) : (
                <Link
                  to="/auth/setup-2fa"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#235697]"
                >
                  Set up 2FA
                </Link>
              )}
            </div>
          </div>
        )}

        {tab === 'activity' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-[#235697]" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Security Activity</h2>
              </div>
              <button
                onClick={handleExport}
                className="text-xs font-semibold text-[#235697] inline-flex items-center gap-1"
              >
                <Download size={14} />
                Export
              </button>
            </div>
            {eventsLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl" />
              </div>
            ) : events.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No recent security events.</p>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className={`border rounded-xl p-3 flex items-start gap-3 ${eventTone(
                      event.severity
                    )}`}
                  >
                    <AlertTriangle size={16} className="mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{formatEventName(event.event_type)}</p>
                      <p className="text-xs text-gray-600">
                        {event.created_at ? new Date(event.created_at).toLocaleString() : 'Unknown'} ·{' '}
                        {event.ip_address || 'IP unknown'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
