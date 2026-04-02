import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, Laptop, Smartphone, Tablet, Trash2 } from 'lucide-react';
import { tokenStore, userAPI } from '../../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';

export default function DeviceManagement() {
  type SessionRow = {
    id: string;
    device_id?: string;
    label?: string;
    trusted?: number | boolean;
    user_agent?: string;
    last_seen?: string;
    ip_address?: string;
  };

  const [devices, setDevices] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const deviceId = useMemo(() => tokenStore.getDeviceId(), []);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const rows = await userAPI.getSessions();
      setDevices(rows || []);
    } catch {
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const getIcon = (ua: string) => {
    if (/Mobi|Android/i.test(ua)) return Smartphone;
    if (/Tablet|iPad/i.test(ua)) return Tablet;
    return Laptop;
  };

  const revoke = async (id: string) => {
    await userAPI.revokeSession(id);
    setConfirmingId(null);
    await loadDevices();
  };

  const startEdit = (device: SessionRow) => {
    setEditingId(device.id);
    setLabelDraft(device.label || '');
  };

  const saveLabel = async (device: SessionRow) => {
    await userAPI.renameSession(device.id, labelDraft.trim());
    setEditingId(null);
    setLabelDraft('');
    await loadDevices();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-10">
        <div className="flex items-center gap-4">
          <Link to="/security-center" className="text-white">
            <ChevronLeft size={24} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Device Management</h1>
            <p className="text-white/70 text-sm">Review and revoke devices</p>
          </div>
        </div>
      </div>

      <div className="px-6 -mt-8 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : devices.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 text-center text-sm text-gray-500">
            No devices found.
          </div>
        ) : (
          devices.map((device) => {
            const Icon = getIcon(device.user_agent || '');
            const isCurrent = device.device_id === deviceId;
            const isVerified = device.trusted !== 0;
            return (
              <div
                key={device.id}
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
                      {editingId === device.id ? (
                        <input
                          value={labelDraft}
                          onChange={(e) => setLabelDraft(e.target.value)}
                          className="text-sm font-semibold text-gray-900 dark:text-white bg-transparent border-b border-gray-200 dark:border-gray-700 focus:outline-none"
                          placeholder="Device name"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {device.label || device.device_id}
                        </p>
                      )}
                      {isCurrent && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          Current
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          isVerified ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {isVerified ? 'Verified' : 'Unverified'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Last seen: {device.last_seen ? new Date(device.last_seen).toLocaleString() : 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {device.ip_address || 'IP unknown'} - {device.user_agent || 'Device'}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      {editingId === device.id ? (
                        <>
                          <button
                            onClick={() => saveLabel(device)}
                            className="text-[#235697] font-semibold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-gray-500"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => startEdit(device)}
                          className="text-[#235697] font-semibold"
                        >
                          Rename
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setConfirmingId(device.id)}
                  className="text-xs text-red-600 font-semibold flex items-center gap-1"
                  disabled={isCurrent}
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
        open={Boolean(confirmingId)}
        title="Disable this device?"
        description="You will need to log in again from it."
        confirmLabel="Disable"
        onConfirm={() => confirmingId && revoke(confirmingId)}
        onCancel={() => setConfirmingId(null)}
      />
    </div>
  );
}
