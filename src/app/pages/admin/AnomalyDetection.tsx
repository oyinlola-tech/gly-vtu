import { useEffect, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { adminAPI } from '../../../services/api';

interface Anomaly {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  userId?: string;
  createdAt?: string;
}

export default function AnomalyDetection() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI
      .getAnomalies?.()
      .then((data) => setAnomalies(data || []))
      .catch(() => setAnomalies([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
            <TriangleAlert size={20} className="text-yellow-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Anomaly Detection</h1>
            <p className="text-sm text-gray-500">Monitor risky activity and suspicious accounts</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading anomalies...</div>
          ) : anomalies.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No anomalies detected.</div>
          ) : (
            <div className="divide-y">
              {anomalies.map((item) => (
                <div key={item.id} className="p-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.type}</p>
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    {item.userId && (
                      <p className="text-xs text-gray-400 mt-2">User: {item.userId}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-2 py-1 rounded-full border border-gray-200 capitalize">
                      {item.severity}
                    </span>
                    <p className="text-xs text-gray-400 mt-2">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
                    </p>
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
