import { useEffect, useState } from 'react';
import { Download, Filter, ShieldAlert } from 'lucide-react';
import { adminAPI } from '../../../services/api';

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  actor_type?: string;
  actor_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

export default function SecurityEventsDashboard() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ severity: '', type: '' });

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getSecurityEvents?.({ severity: filters.severity, type: filters.type });
      setEvents(data || []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [filters.severity, filters.type]);

  const handleExport = async () => {
    try {
      const blob = await adminAPI.downloadSecurityEvents?.();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-events-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <ShieldAlert className="text-red-600" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Security Events</h1>
              <p className="text-sm text-gray-500">Monitor all critical security events</p>
            </div>
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold"
          >
            <Download size={16} />
            Export
          </button>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 flex flex-wrap gap-3 items-center">
          <Filter size={16} className="text-gray-500" />
          <select
            value={filters.severity}
            onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">All severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <input
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            placeholder="Event type"
            className="flex-1 min-w-[180px] px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No security events found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-left">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">IP</th>
                    <th className="px-4 py-3">User Agent</th>
                    <th className="px-4 py-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td className="px-4 py-3 font-semibold text-gray-900">{event.event_type}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full text-xs border border-gray-200">
                          {event.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {event.actor_type}:{event.actor_id?.slice(0, 6)}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{event.ip_address || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{event.user_agent || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {event.created_at ? new Date(event.created_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
