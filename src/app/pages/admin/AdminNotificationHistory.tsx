import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { adminAPI } from '../../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

type NotificationLog = {
  id: string;
  title: string;
  body: string;
  type: string;
  target_scope: 'broadcast' | 'single';
  target_user_id?: string | null;
  force: number;
  created_by?: string;
  created_by_name?: string | null;
  created_by_email?: string | null;
  created_at: string;
};

export default function AdminNotificationHistory() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminAPI.getNotificationHistory({ limit: 100 });
      setLogs((data || []) as NotificationLog[]);
    } catch (err) {
      const msg = (err as Error)?.message || 'Failed to load notification history';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notification History</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Review recent push notifications sent by admins.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/admin/notifications" className="text-sm text-[#235697] font-semibold">
              Send notification
            </Link>
            <Link to="/admin" className="text-sm text-[#235697] font-semibold">
              Back to dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6">
          {loading ? (
            <div className="py-6 flex items-center justify-center">
              <LoadingSpinner size="sm" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No notifications sent yet.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-2"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{log.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{log.body}</p>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
                    <span>Type: {log.type}</span>
                    <span>Scope: {log.target_scope}</span>
                    {log.target_user_id && <span>Target: {log.target_user_id}</span>}
                    <span>Force: {log.force ? 'Yes' : 'No'}</span>
                    <span>
                      Sent by: {log.created_by_name || log.created_by_email || log.created_by || 'Unknown'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
