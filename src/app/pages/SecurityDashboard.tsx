import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Shield, Lock, Smartphone, Eye, EyeOff } from 'lucide-react';
import { userAPI } from '../../services/api';

interface SecurityStatus {
  pinSet: boolean;
  totpEnabled: boolean;
  backupCodesGenerated: boolean;
  devicesCount: number;
  lastActivityAt: string;
  suspiciousActivities: Array<{
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
    ? [security.pinSet ? 25 : 0, security.totpEnabled ? 25 : 0, security.backupCodesGenerated ? 25 : 0, security.devicesCount <= 3 ? 25 : 15].reduce((a, b) => a + b, 0)
    : 0;

  const securityLevel = securityScore >= 75 ? 'High' : securityScore >= 50 ? 'Medium' : 'Low';
  const securityColor = securityScore >= 75 ? 'text-green-600' : securityScore >= 50 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Security Dashboard</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Security Score Card */}
      <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Overall Security Score</p>
            <p className={`text-4xl font-bold ${securityColor}`}>{securityScore}%</p>
            <p className={`text-lg font-semibold mt-1 ${securityColor}`}>{securityLevel} Security</p>
          </div>
          <Shield className={`w-16 h-16 ${securityColor}`} />
        </div>
      </div>

      {/* Security Features Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Transaction PIN */}
        <div className="border rounded-lg p-4 flex items-start gap-3">
          <Lock size={20} className={security?.pinSet ? 'text-green-600' : 'text-gray-400'} />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Transaction PIN</h3>
            <p className={`text-sm mt-1 ${security?.pinSet ? 'text-green-600' : 'text-red-600'}`}>
              {security?.pinSet ? '✓ Set' : '✗ Not Set'}
            </p>
            <p className="text-xs text-gray-500 mt-2">Protects sensitive transactions with a personal identification number</p>
          </div>
        </div>

        {/* Two-Factor Authentication */}
        <div className="border rounded-lg p-4 flex items-start gap-3">
          <Smartphone size={20} className={security?.totpEnabled ? 'text-green-600' : 'text-gray-400'} />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Two-Factor Authentication (2FA)</h3>
            <p className={`text-sm mt-1 ${security?.totpEnabled ? 'text-green-600' : 'text-red-600'}`}>
              {security?.totpEnabled ? '✓ Enabled' : '✗ Disabled'}
            </p>
            <p className="text-xs text-gray-500 mt-2">Use your authenticator app for login verification</p>
          </div>
        </div>

        {/* Backup Codes */}
        <div className="border rounded-lg p-4 flex items-start gap-3">
          <CheckCircle size={20} className={security?.backupCodesGenerated ? 'text-green-600' : 'text-gray-400'} />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Backup Codes</h3>
            <p className={`text-sm mt-1 ${security?.backupCodesGenerated ? 'text-green-600' : 'text-amber-600'}`}>
              {security?.backupCodesGenerated ? '✓ Generated' : '⚠ Not Generated'}
            </p>
            <p className="text-xs text-gray-500 mt-2">Use these codes if you lose access to your authenticator app</p>
          </div>
        </div>

        {/* Active Devices */}
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

      {/* Action Buttons */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <h2 className="font-semibold text-gray-900 mb-4">Improve Your Security</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {!security?.pinSet && (
            <button className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition">
              Set Transaction PIN
            </button>
          )}
          {!security?.totpEnabled && (
            <button className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition">
              Enable 2-Factor Authentication
            </button>
          )}
          <button className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition">
            View Active Devices
          </button>
          <button className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition">
            Security Events Log
          </button>
        </div>
      </div>

      {/* Suspicious Activities */}
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
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                    activity.severity === 'high' ? 'bg-red-100 text-red-800' : 
                    activity.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-green-100 text-green-800'
                  }`}>
                    {activity.severity.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-gray-600">From: {activity.ip}</p>
                <p className="text-xs text-gray-500">{new Date(activity.timestamp).toLocaleString()}</p>
              </div>
            ))}
          </div>
          <button className="mt-4 text-red-600 hover:text-red-700 font-semibold text-sm">
            View All Security Events →
          </button>
        </div>
      )}
    </div>
  );
}
