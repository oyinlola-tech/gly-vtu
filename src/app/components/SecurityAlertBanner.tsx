import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { userAPI } from '../../services/api';
import type { SecurityAlert } from '../../types/api';

export default function SecurityAlertBanner() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    userAPI
      .getSecurityAlerts?.()
      .then((data) => {
        if (!mounted) return;
        setAlerts((data?.alerts || []) as SecurityAlert[]);
      })
      .catch(() => null)
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [user]);

  const activeAlerts = useMemo(
    () => alerts.filter((a) => !dismissed.has(a.id)),
    [alerts, dismissed]
  );

  if (!user || loading || activeAlerts.length === 0) return null;

  const tone = (severity: SecurityAlert['severity'] = 'low') => {
    if (severity === 'critical') return 'border-red-300 bg-red-50 text-red-900';
    if (severity === 'high') return 'border-red-200 bg-red-50 text-red-900';
    if (severity === 'medium') return 'border-yellow-200 bg-yellow-50 text-yellow-900';
    return 'border-blue-200 bg-blue-50 text-blue-900';
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 bg-white/80 backdrop-blur border-b border-gray-200">
      <div className="max-w-6xl mx-auto space-y-2">
        {activeAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-start gap-3 border rounded-xl p-3 shadow-sm ${tone(alert.severity)}`}
          >
            <AlertTriangle className="mt-0.5 flex-shrink-0" size={18} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm">{alert.title || 'Security alert'}</h4>
                {alert.createdAt && (
                  <span className="text-xs text-gray-500">
                    {new Date(alert.createdAt).toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-sm opacity-90">{alert.message || 'Please review your account activity.'}</p>
              {alert.actionUrl && (
                <a
                  href={alert.actionUrl}
                  className="text-sm font-semibold underline underline-offset-2 mt-2 inline-block"
                >
                  Take action
                </a>
              )}
            </div>
            <button
              onClick={() => setDismissed(new Set(dismissed).add(alert.id))}
              className="text-gray-500 hover:text-gray-900"
              aria-label="Dismiss alert"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
