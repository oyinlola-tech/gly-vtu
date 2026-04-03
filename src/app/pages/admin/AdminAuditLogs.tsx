import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Filter } from 'lucide-react';
import { adminAPI } from '../../../services/api';

export default function AdminAuditLogs() {
  type AuditLog = {
    id: string;
    action?: string;
    actor_type?: string;
    actor_id?: string;
    created_at?: string;
    entity_type?: string;
    entity_id?: string;
    ip_address?: string;
  };

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    actorType: '',
    action: '',
    entityType: '',
    from: '',
    to: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await adminAPI.getAuditLogs({
        limit: 200,
        actorType: filters.actorType || undefined,
        action: filters.action || undefined,
        entityType: filters.entityType || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      })) as AuditLog[] | undefined;
      setLogs(data || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filters.action, filters.actorType, filters.entityType, filters.from, filters.to]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => logs, [logs]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-10">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="text-white">
            <ArrowLeft size={22} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
            <p className="text-white/70 text-sm">Track admin and system activity</p>
          </div>
        </div>
      </div>

      <div className="px-6 -mt-6 pb-10 space-y-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-5">
          <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-gray-800 dark:text-gray-200">
            <Filter size={16} />
            Filters
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              value={filters.actorType}
              onChange={(e) => setFilters((prev) => ({ ...prev, actorType: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              placeholder="Actor type"
            />
            <input
              value={filters.action}
              onChange={(e) => setFilters((prev) => ({ ...prev, action: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              placeholder="Action"
            />
            <input
              value={filters.entityType}
              onChange={(e) => setFilters((prev) => ({ ...prev, entityType: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              placeholder="Entity type"
            />
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            />
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            />
          </div>
          <div className="mt-4">
            <button
              onClick={load}
              className="bg-[#235697] text-white px-4 py-2 rounded-lg text-xs font-semibold"
            >
              Apply Filters
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-5">
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading logs...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No logs found.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((log) => (
                <div key={log.id} className="border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {log.action}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {log.actor_type} · {log.actor_id || 'system'}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                    </p>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    {log.entity_type && <p>Entity: {log.entity_type} · {log.entity_id}</p>}
                    {log.ip_address && <p>IP: {log.ip_address}</p>}
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
