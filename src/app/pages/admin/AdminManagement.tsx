import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { adminAPI } from '../../../services/api';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at?: string;
  disabled_at?: string | null;
  disabled_reason?: string | null;
};

export default function AdminManagement() {
  const { admin } = useAdminAuth();
  const isSuperAdmin = admin?.role === 'superadmin';
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [roleMatrix, setRoleMatrix] = useState<Record<string, string[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [roleEdits, setRoleEdits] = useState<Record<string, string>>({});
  const [disableReasons, setDisableReasons] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [adminsRes, rolesRes, matrixRes] = await Promise.all([
        adminAPI.getAdmins(),
        adminAPI.getAdminRoles(),
        adminAPI.getRoleMatrix(),
      ]);
      setAdmins((adminsRes || []) as AdminUser[]);
      setRoles((rolesRes || []) as string[]);
      setRoleMatrix((matrixRes || {}) as Record<string, string[]>);
    } catch (err) {
      const msg = (err as Error)?.message || 'Failed to load admin users';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isSuperAdmin, loadData]);

  const roleOptions = useMemo(() => {
    if (roles.length) return roles;
    return ['superadmin', 'admin', 'operations', 'support', 'finance', 'compliance'];
  }, [roles]);

  const matrixPermissions = useMemo(() => {
    const matrix = roleMatrix || {};
    const perms = new Set<string>();
    Object.values(matrix).forEach((list) => {
      list.forEach((perm) => {
        if (perm !== '*') perms.add(perm);
      });
    });
    return Array.from(perms).sort();
  }, [roleMatrix]);

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await adminAPI.createAdmin(formData);
      setMessage('Admin created successfully');
      setFormData({ name: '', email: '', password: '', role: 'admin' });
      await loadData();
    } catch (err) {
      const msg = (err as Error)?.message || 'Failed to create admin';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleRoleSave = async (id: string) => {
    const newRole = roleEdits[id];
    if (!newRole) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await adminAPI.updateAdminRole(id, newRole);
      setMessage('Admin role updated');
      setRoleEdits((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await loadData();
    } catch (err) {
      const msg = (err as Error)?.message || 'Failed to update admin role';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this admin account? This cannot be undone.')) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await adminAPI.deleteAdmin(id);
      setMessage('Admin deleted');
      await loadData();
    } catch (err) {
      const msg = (err as Error)?.message || 'Failed to delete admin';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async (id: string) => {
    const reason = disableReasons[id]?.trim() || undefined;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await adminAPI.disableAdmin(id, reason);
      setMessage('Admin disabled');
      await loadData();
    } catch (err) {
      const msg = (err as Error)?.message || 'Failed to disable admin';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleEnable = async (id: string) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await adminAPI.enableAdmin(id);
      setMessage('Admin enabled');
      await loadData();
    } catch (err) {
      const msg = (err as Error)?.message || 'Failed to enable admin';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-6 py-10">
        <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Admin Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Only super admins can create or remove admin accounts.
          </p>
          <Link to="/admin" className="text-sm text-[#235697] font-semibold">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Create admins, update roles, and remove access.
            </p>
          </div>
          <Link to="/admin" className="text-sm text-[#235697] font-semibold">
            Back to dashboard
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-3 rounded-xl text-sm">
            {message}
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Create Admin</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              placeholder="Full name"
            />
            <input
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              placeholder="Email"
            />
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              placeholder="Temporary password"
            />
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCreate}
            disabled={saving || !formData.name || !formData.email || !formData.password}
            className="mt-4 bg-[#235697] text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {saving ? <LoadingSpinner size="sm" /> : 'Create Admin'}
          </button>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Existing Admins</h2>
          {loading ? (
            <div className="py-6 flex items-center justify-center">
              <LoadingSpinner size="sm" />
            </div>
          ) : admins.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No admins found.</p>
          ) : (
            <div className="space-y-3">
              {admins.map((row) => {
                const pendingRole = roleEdits[row.id] ?? row.role;
                const isSelf = row.id === admin?.id;
                const isDisabled = Boolean(row.disabled_at);
                return (
                  <div
                    key={row.id}
                    className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center gap-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{row.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{row.email}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Status: <span className={isDisabled ? 'text-red-500 font-semibold' : 'text-green-600 font-semibold'}>
                          {isDisabled ? 'Disabled' : 'Active'}
                        </span>
                      </p>
                      {isDisabled && row.disabled_reason && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Reason: {row.disabled_reason}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Created: {row.created_at ? new Date(row.created_at).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={pendingRole}
                        onChange={(e) =>
                          setRoleEdits((prev) => ({ ...prev, [row.id]: e.target.value }))
                        }
                        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs"
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleRoleSave(row.id)}
                        disabled={saving || pendingRole === row.role}
                        className="bg-[#235697] text-white px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                      >
                        Save
                      </button>
                      {!isDisabled && (
                        <input
                          value={disableReasons[row.id] || ''}
                          onChange={(e) =>
                            setDisableReasons((prev) => ({ ...prev, [row.id]: e.target.value }))
                          }
                          placeholder="Disable reason (optional)"
                          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs"
                        />
                      )}
                      {isDisabled ? (
                        <button
                          onClick={() => handleEnable(row.id)}
                          disabled={saving}
                          className="bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                        >
                          Enable
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDisable(row.id)}
                          disabled={saving || isSelf}
                          className="bg-yellow-600 text-white px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                        >
                          Disable
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(row.id)}
                        disabled={saving || isSelf}
                        className="bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                      >
                        {isSelf ? 'You' : 'Delete'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Role Matrix</h2>
          {!roleMatrix ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No role data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400">
                    <th className="py-2 pr-4">Permission</th>
                    {roleOptions.map((role) => (
                      <th key={role} className="py-2 pr-4 capitalize">
                        {role}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-200 dark:border-gray-800">
                    <td className="py-2 pr-4 font-semibold text-gray-700 dark:text-gray-300">All Permissions</td>
                    {roleOptions.map((role) => (
                      <td key={role} className="py-2 pr-4">
                        {roleMatrix[role]?.includes('*') ? 'Yes' : '—'}
                      </td>
                    ))}
                  </tr>
                  {matrixPermissions.map((perm) => (
                    <tr key={perm} className="border-t border-gray-200 dark:border-gray-800">
                      <td className="py-2 pr-4 font-mono text-xs text-gray-600 dark:text-gray-400">{perm}</td>
                      {roleOptions.map((role) => (
                        <td key={role} className="py-2 pr-4">
                          {roleMatrix[role]?.includes('*') || roleMatrix[role]?.includes(perm)
                            ? 'Yes'
                            : '—'}
                        </td>
                      ))}
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
