import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Shield, Lock, Smartphone } from 'lucide-react';
import { Link } from 'react-router';
import { userAPI } from '../../services/api';
import ActivityTimeline from '../components/ActivityTimeline';
import Breadcrumbs from '../components/Breadcrumbs';

interface SecurityStatus {
  pinSet?: boolean;
  totpEnabled?: boolean;
  backupCodesGenerated?: boolean;
  devicesCount?: number;
  lastActivityAt?: string;
  biometricEnabled?: boolean;
  securityQuestionEnabled?: boolean;
  loginFailedAttempts?: number;
  passwordUpdatedAt?: string | null;
  recentLogins?: Array<{
    ip: string | null;
    userAgent: string | null;
    lastSeen: string | null;
  }>;
  securityEvents?: Array<{
    id: string;
    type: string;
    title: string;
    description?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    createdAt: string;
    ipAddress?: string;
    userAgent?: string;
  }>;
  suspiciousActivities?: Array<{
    id: string;
    type: string;
    message: string;
    ip: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

export function SecurityDashboard() {
  const [security, setSecurity] = useState<SecurityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSecurityStatus();
  }, []);

  async function loadSecurityStatus() {
    try {
      setLoading(true);
      const data = await userAPI.getSecurityStatus();
      setSecurity(data);
      setError(null);
    } catch (err) {
      setError('Failed to load security status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const securityScore = security
    ? [
        security.pinSet ? 20 : 0,
        security.totpEnabled ? 25 : 0,
        security.backupCodesGenerated ? 15 : 0,
        (security.devicesCount ?? 0) <= 3 ? 20 : 10,
        security.securityQuestionEnabled ? 10 : 0,
        security.biometricEnabled ? 10 : 0,
      ].reduce((a, b) => a + b, 0)
    : 0;

  const securityLevel = securityScore >= 75 ? 'High' : securityScore >= 50 ? 'Medium' : 'Low';
  const securityColor = securityScore >= 75 ? 'text-green-600' : securityScore >= 50 ? 'text-yellow-600' : 'text-red-600';

  const passwordAgeDays = security?.passwordUpdatedAt
    ? Math.floor((Date.now() - new Date(security.passwordUpdatedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <Breadcrumbs items={[{ label: 'Settings', href: '/more' }, { label: 'Security Dashboard' }]} />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Security Dashboard</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Overall Security Score</p>
            <p className={`text-4xl font-bold ${securityColor}`}>{securityScore}%</p>
            <p className={`text-lg font-semibold mt-1 ${securityColor}`}>{securityLevel} Security</p>
            {passwordAgeDays !== null && (
              <p className="text-xs text-gray-500 mt-2">
                Password last updated {passwordAgeDays} day{passwordAgeDays === 1 ? '' : 's'} ago
              </p>
            )}
          </div>
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: `conic-gradient(#235697 ${securityScore * 3.6}deg, #e5e7eb 0deg)`,
            }}
          >
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
              <Shield className={`w-8 h-8 ${securityColor}`} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="border rounded-lg p-4 flex items-start gap-3">
          <Lock size={20} className={security?.pinSet ? 'text-green-600' : 'text-gray-400'} />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Transaction PIN</h3>
            <p className={`text-sm mt-1 ${security?.pinSet ? 'text-green-600' : 'text-red-600'}`}>
              {security?.pinSet ? 'Set' : 'Not Set'}
            </p>
            <p className="text-xs text-gray-500 mt-2">Protects sensitive transactions with a personal identification number</p>
          </div>
        </div>

        <div className="border rounded-lg p-4 flex items-start gap-3">
          <Smartphone size={20} className={security?.totpEnabled ? 'text-green-600' : 'text-gray-400'} />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Two-Factor Authentication (2FA)</h3>
            <p className={`text-sm mt-1 ${security?.totpEnabled ? 'text-green-600' : 'text-red-600'}`}>
              {security?.totpEnabled ? 'Enabled' : 'Disabled'}
            </p>
            <p className="text-xs text-gray-500 mt-2">Use your authenticator app for login verification</p>
          </div>
        </div>

        <div className="border rounded-lg p-4 flex items-start gap-3">
          <CheckCircle size={20} className={security?.backupCodesGenerated ? 'text-green-600' : 'text-gray-400'} />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Backup Codes</h3>
            <p className={`text-sm mt-1 ${security?.backupCodesGenerated ? 'text-green-600' : 'text-amber-600'}`}>
              {security?.backupCodesGenerated ? 'Generated' : 'Not Generated'}
            </p>
            <p className="text-xs text-gray-500 mt-2">Use these codes if you lose access to your authenticator app</p>
          </div>
        </div>

        <div className="border rounded-lg p-4 flex items-start gap-3">
          <Smartphone size={20} className="text-blue-600" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Active Devices</h3>
            <p className={`text-sm mt-1 ${(security?.devicesCount || 0) <= 3 ? 'text-green-600' : 'text-amber-600'}`}>
              {security?.devicesCount || 0} device{((security?.devicesCount || 0) !== 1) ? 's' : ''}
            </p>
            <p className="text-xs text-gray-500 mt-2">Review and manage all your connected devices</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <h2 className="font-semibold text-gray-900 mb-4">Improve Your Security</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {!security?.pinSet && (
            <Link to="/set-pin" className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition text-center">
              Set Transaction PIN
            </Link>
          )}
          {!security?.totpEnabled && (
            <Link to="/auth/setup-2fa" className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition text-center">
              Enable 2-Factor Authentication
            </Link>
          )}
          <Link to="/settings/devices" className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition text-center">
            View Active Devices
          </Link>
          <Link to="/security/activity" className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition text-center">
            Security Events Log
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Login Locations</h2>
          {(security?.recentLogins || []).length === 0 ? (
            <p className="text-sm text-gray-500">No recent login activity.</p>
          ) : (
            <div className="space-y-3 text-sm">
              {security?.recentLogins?.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{item.ip || 'Unknown IP'}</p>
                    <p className="text-xs text-gray-500">{item.userAgent || 'Unknown device'}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {item.lastSeen ? new Date(item.lastSeen).toLocaleString() : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Failed Login Attempts</h2>
          <p className="text-3xl font-bold text-gray-900">
            {security?.loginFailedAttempts ?? 0}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            If you don’t recognize these attempts, change your password immediately.
          </p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="font-semibold text-gray-900 mb-4">Recent Security Activity</h2>
        <ActivityTimeline events={security?.securityEvents || []} />
      </div>

      {security?.suspiciousActivities && security.suspiciousActivities.length > 0 && (
        <div className="border border-red-200 rounded-lg p-6 bg-red-50">
          <h2 className="font-semibold text-red-900 mb-4 flex items-center gap-2">
            <AlertCircle size={20} />
            Suspicious Activities Detected
          </h2>
          <div className="space-y-3">
            {security.suspiciousActivities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="bg-white p-3 rounded border border-red-200">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-semibold text-gray-900">{activity.message}</p>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded ${
                      activity.severity === 'high'
                        ? 'bg-red-100 text-red-800'
                        : activity.severity === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {activity.severity.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-gray-600">From: {activity.ip}</p>
                <p className="text-xs text-gray-500">{new Date(activity.timestamp).toLocaleString()}</p>
              </div>
            ))}
          </div>
          <Link to="/security/activity" className="mt-4 inline-block text-red-600 hover:text-red-700 font-semibold text-sm">
            View All Security Events →
          </Link>
        </div>
      )}
    </div>
  );
}
