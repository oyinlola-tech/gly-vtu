import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Check, X } from 'lucide-react';
import { adminAPI } from '../../../services/api';

export default function AdminReview() {
  type HeldTopup = {
    reference: string;
    full_name?: string;
    amount?: number;
    created_at?: string;
  };
  type AdminAdjustment = {
    id: string;
    full_name?: string;
    type?: string;
    amount?: number;
    created_at?: string;
  };

  const [heldTopups, setHeldTopups] = useState<HeldTopup[]>([]);
  const [adjustments, setAdjustments] = useState<AdminAdjustment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [topups, adjs] = await Promise.all([
        adminAPI.getHeldTopups(),
        adminAPI.getAdminAdjustments('pending'),
      ]);
      setHeldTopups((topups as HeldTopup[]) || []);
      setAdjustments((adjs as AdminAdjustment[]) || []);
    } catch {
      setHeldTopups([]);
      setAdjustments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-10">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="text-white">
            <ArrowLeft size={22} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Review</h1>
            <p className="text-white/70 text-sm">Approve held top-ups and adjustments</p>
          </div>
        </div>
      </div>

      <div className="px-6 -mt-6 pb-10 space-y-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Held Topups</h2>
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading approvals...</p>
          ) : heldTopups.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No held topups.</p>
          ) : (
            <div className="space-y-3">
              {heldTopups.map((topup) => (
                <div
                  key={topup.reference}
                  className="border border-gray-200 dark:border-gray-800 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {topup.full_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {topup.reference}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        ₦{Number(topup.amount || 0).toLocaleString('en-NG', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {topup.created_at ? new Date(topup.created_at).toLocaleString() : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => adminAPI.approveHeldTopup(topup.reference).then(load)}
                      className="flex items-center gap-1 bg-green-600 text-white text-xs px-3 py-2 rounded-lg"
                    >
                      <Check size={14} />
                      Approve
                    </button>
                    <button
                      onClick={() => adminAPI.rejectHeldTopup(topup.reference).then(load)}
                      className="flex items-center gap-1 bg-red-600 text-white text-xs px-3 py-2 rounded-lg"
                    >
                      <X size={14} />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Admin Adjustments
          </h2>
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading adjustments...</p>
          ) : adjustments.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No pending adjustments.</p>
          ) : (
            <div className="space-y-3">
              {adjustments.map((adj) => (
                <div
                  key={adj.id}
                  className="border border-gray-200 dark:border-gray-800 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {adj.full_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{adj.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        ₦{Number(adj.amount || 0).toLocaleString('en-NG', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {adj.created_at ? new Date(adj.created_at).toLocaleString() : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => adminAPI.approveAdminAdjustment(adj.id).then(load)}
                      className="flex items-center gap-1 bg-green-600 text-white text-xs px-3 py-2 rounded-lg"
                    >
                      <Check size={14} />
                      Approve
                    </button>
                    <button
                      onClick={() => adminAPI.rejectAdminAdjustment(adj.id).then(load)}
                      className="flex items-center gap-1 bg-red-600 text-white text-xs px-3 py-2 rounded-lg"
                    >
                      <X size={14} />
                      Reject
                    </button>
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
