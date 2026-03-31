import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { adminAPI } from '../../../services/api';

interface ComplianceItem {
  id: string;
  user_id: string;
  status: string;
  level: number;
  created_at?: string;
  full_name?: string;
  email?: string;
}

export default function ComplianceManagement() {
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI
      .getComplianceQueue?.()
      .then((data) => setItems(data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <ShieldCheck size={20} className="text-green-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Compliance & KYC</h1>
            <p className="text-sm text-gray-500">Review KYC verification status and risk scoring</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading KYC queue...</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No KYC items pending.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Level</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-semibold text-gray-900">{item.full_name || item.user_id}</td>
                      <td className="px-4 py-3 text-gray-500">{item.email || '—'}</td>
                      <td className="px-4 py-3">Level {item.level}</td>
                      <td className="px-4 py-3 capitalize">{item.status}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {item.created_at ? new Date(item.created_at).toLocaleString() : '—'}
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
