import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, Laptop, MapPin, Smartphone, Tablet, Trash2 } from 'lucide-react';
import { tokenStore, userAPI } from '../../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';
import Breadcrumbs from '../components/Breadcrumbs';

export default function SessionManagement() {
  type SessionRow = {
    id: string;
    device_id?: string;
    label?: string;
    trusted?: number | boolean;
    last_seen?: string;
    ip_address?: string;
    user_agent?: string;
    location?: string;
  };

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

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
    tokenStore.getDeviceId().then((id) => setDeviceId(id));
  }, []);

  const getIcon = (ua: string) => {
    if (/Mobi|Android/i.test(ua)) return Smartphone;
    if (/Tablet|iPad/i.test(ua)) return Tablet;
    return Laptop;
  };

  const revoke = async (id: string) => {
    await userAPI.revokeSession(id);
    setConfirming(null);
    await loadSessions();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-10">
        <div className="flex items-center gap-4">
          <Link to="/security-center" className="text-white">
            <ChevronLeft size={24} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Session Management</h1>
            <p className="text-white/70 text-sm">Review and revoke active sessions</p>
          </div>
        </div>
        <div className="mt-4 text-white/70">
          <Breadcrumbs
            items={[
              { label: 'Security', href: '/security-center' },
              { label: 'Session Management' },
            ]}
          />
        </div>
      </div>

      <div className="px-6 -mt-8 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 text-center text-sm text-gray-500">
            No active sessions found.
          </div>
        ) : (
          sessions.map((session) => {
            const Icon = getIcon(session.user_agent || '');
            const isCurrent = session.device_id === deviceId;
            return (
              <div
                key={session.id}
                className={`bg-white dark:bg-gray-900 rounded-2xl shadow p-4 flex items-start justify-between gap-4 ${
                  isCurrent ? 'border border-green-200' : 'border border-gray-200 dark:border-gray-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <Icon size={18} className="text-[#235697]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {session.label || session.device_id}
                      </p>
                      {isCurrent && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          Current
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          session.trusted !== 0
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {session.trusted !== 0 ? 'Verified' : 'Unverified'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Last seen: {session.last_seen ? new Date(session.last_seen).toLocaleString() : 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {session.ip_address || 'IP unknown'} - {session.user_agent || 'Device'}
                    </p>
                    <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                      <MapPin size={12} />
                      {session.location || 'Location unavailable'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setConfirming(session.id)}
                  className="text-xs text-red-600 font-semibold flex items-center gap-1"
                  disabled={isCurrent}
                  aria-label="Revoke session"
                >
                  <Trash2 size={14} />
                  {isCurrent ? 'Current' : 'Revoke'}
                </button>
              </div>
            );
          })
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirming)}
        title="Revoke this session?"
        description="You will need to log in again on that device."
        confirmLabel="Revoke"
        onConfirm={() => confirming && revoke(confirming)}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
