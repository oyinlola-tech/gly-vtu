import { useState } from 'react';
import { Link } from 'react-router';
import { adminAPI } from '../../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminNotifications() {
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    userId: '',
    type: 'info',
    force: true,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!formData.title || !formData.body) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await adminAPI.sendNotification({
        title: formData.title,
        body: formData.body,
        type: formData.type,
        force: formData.force,
        userId: formData.userId.trim() || undefined,
      });
      setMessage('Notification sent');
      setFormData({ title: '', body: '', userId: '', type: 'info', force: true });
    } catch (err) {
      const msg = (err as Error)?.message || 'Failed to send notification';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Push Notifications</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Broadcast to all users or target a specific user ID.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/admin/notifications/history" className="text-sm text-[#235697] font-semibold">
              View history
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
        {message && (
          <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-3 rounded-xl text-sm">
            {message}
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6 space-y-4">
          <div>
            <label htmlFor="notificationTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title
            </label>
            <input
              id="notificationTitle"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              placeholder="Title"
            />
          </div>
          <div>
            <label htmlFor="notificationBody" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message
            </label>
            <textarea
              id="notificationBody"
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm h-28"
              placeholder="Message body"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="notificationType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                id="notificationType"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              >
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div>
              <label htmlFor="notificationUserId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                User ID (optional)
              </label>
              <input
                id="notificationUserId"
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                placeholder="Target user UUID"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={formData.force}
              onChange={(e) => setFormData({ ...formData, force: e.target.checked })}
            />
            Force push notification
          </label>
          <button
            onClick={handleSend}
            disabled={loading || !formData.title || !formData.body}
            className="w-full bg-[#235697] text-white py-3 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Send Notification'}
          </button>
        </div>
      </div>
    </div>
  );
}
