import { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle, Shield, LogOut, Eye, MapPin, HelpCircle } from 'lucide-react';
import { userAPI } from '../../services/api';

interface SecurityEvent {
  id: string;
  type: 'login' | 'logout' | 'password_change' | 'totp_enabled' | 'totp_disabled' | 'failed_login' | 'device_added' | 'device_removed' | 'unusual_activity';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  ipAddress: string;
  location?: string;
  device?: string;
  timestamp: string;
}

export function SecurityActivityPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [filter, setFilter] = useState<'all' | 'security' | 'login' | 'account'>('all');

  useEffect(() => {
    loadSecurityEvents();
  }, []);

  const normalizeEvent = (row: any): SecurityEvent => {
    if (row?.title) {
      return {
        id: row.id,
        type: row.type,
        severity: row.severity,
        title: row.title,
        description: row.description,
        ipAddress: row.ipAddress || row.ip_address || '',
        location: row.location,
        device: row.device || row.userAgent,
        timestamp: row.createdAt || row.created_at || row.timestamp,
      };
    }
    const meta = row?.metadata || row?.details || {};
    const rawType = row.event_type || row.type || 'security';
    const mappedType =
      rawType.includes('login') && rawType.includes('failed')
        ? 'failed_login'
        : rawType.includes('login')
          ? 'login'
          : rawType.includes('logout')
            ? 'logout'
            : rawType.includes('password')
              ? 'password_change'
              : rawType.includes('totp.enabled')
                ? 'totp_enabled'
                : rawType.includes('totp.disabled')
                  ? 'totp_disabled'
                  : rawType.includes('device')
                    ? 'device_added'
                    : 'unusual_activity';
    return {
      id: row.id,
      type: mappedType,
      severity: row.severity || 'low',
      title: rawType || 'Security event',
      description: meta?.message || row.description || 'Security activity recorded',
      ipAddress: row.ip_address || meta?.ip || '',
      location: meta?.location,
      device: row.user_agent || meta?.device,
      timestamp: row.created_at || row.timestamp || new Date().toISOString(),
    };
  };

  async function loadSecurityEvents() {
    try {
      setLoading(true);
      const data = await userAPI.getSecurityEvents?.();
      setEvents((data || []).map(normalizeEvent));
      setError(null);
    } catch (err) {
      setError('Failed to load security events');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'login': return <CheckCircle className="text-blue-600" size={20} />;
      case 'logout': return <LogOut className="text-gray-600" size={20} />;
      case 'password_change': return <Shield className="text-green-600" size={20} />;
      case 'totp_enabled': return <Shield className="text-green-600" size={20} />;
      case 'totp_disabled': return <AlertCircle className="text-orange-600" size={20} />;
      case 'failed_login': return <AlertTriangle className="text-red-600" size={20} />;
      case 'device_added': return <CheckCircle className="text-blue-600" size={20} />;
      case 'device_removed': return <LogOut className="text-gray-600" size={20} />;
      case 'unusual_activity': return <AlertTriangle className="text-red-600" size={20} />;
      default: return <Eye className="text-gray-600" size={20} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-50 border-red-200 text-red-900';
      case 'medium': return 'bg-orange-50 border-orange-200 text-orange-900';
      case 'low': return 'bg-green-50 border-green-200 text-green-900';
      default: return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high': return { bg: 'bg-red-100', text: 'text-red-800' };
      case 'medium': return { bg: 'bg-orange-100', text: 'text-orange-800' };
      case 'low': return { bg: 'bg-green-100', text: 'text-green-800' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-800' };
    }
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'security') return ['totp_enabled', 'totp_disabled', 'password_change', 'device_added', 'device_removed'].includes(event.type);
    if (filter === 'login') return ['login', 'logout', 'failed_login'].includes(event.type);
    if (filter === 'account') return ['password_change', 'unusual_activity'].includes(event.type);
    return true;
  });

  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (selectedEvent) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <button
          onClick={() => setSelectedEvent(null)}
          className="mb-6 text-blue-600 hover:text-blue-700 font-semibold text-sm"
        >
          ← Back to Security Activity
        </button>

        <div className={`rounded-lg border-2 p-8 ${getSeverityColor(selectedEvent.severity)}`}>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              {getEventIcon(selectedEvent.type)}
              <div>
                <h2 className="text-2xl font-bold">{selectedEvent.title}</h2>
                <p className="text-sm mt-2 opacity-75">{selectedEvent.description}</p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-semibold ${getSeverityBadge(selectedEvent.severity).bg} ${getSeverityBadge(selectedEvent.severity).text}`}>
              {selectedEvent.severity.toUpperCase()}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6 pt-6 border-t opacity-75">
            <div>
              <p className="text-xs font-semibold opacity-75 mb-1">TIMESTAMP</p>
              <p className="text-lg font-semibold">{new Date(selectedEvent.timestamp).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-semibold opacity-75 mb-1">IP ADDRESS</p>
              <p className="text-lg font-semibold font-mono">{selectedEvent.ipAddress}</p>
            </div>
            {selectedEvent.location && (
              <div>
                <p className="text-xs font-semibold opacity-75 mb-1 flex items-center gap-1">
                  <MapPin size={14} /> LOCATION
                </p>
                <p className="text-lg font-semibold">{selectedEvent.location}</p>
              </div>
            )}
            {selectedEvent.device && (
              <div>
                <p className="text-xs font-semibold opacity-75 mb-1">DEVICE</p>
                <p className="text-lg font-semibold">{selectedEvent.device}</p>
              </div>
            )}
          </div>

          {selectedEvent.severity === 'high' && (
            <div className="mt-6 p-4 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>Important:</strong> If you don't recognize this activity, please change your password immediately and review your other security settings.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Security Activity</h1>
        <p className="text-gray-600 mt-1">Monitor all login attempts, account changes, and suspicious activities</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertTriangle className="text-red-600 flex-shrink-0" size={20} />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 border-b border-gray-200">
        {(['all', 'security', 'login', 'account'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-3 font-semibold border-b-2 transition ${
              filter === f
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {f === 'all' ? 'All Activity' : f === 'security' ? 'Security Changes' : f === 'login' ? 'Login Activity' : 'Account Changes'}
          </button>
        ))}
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <Shield className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-600">No security events to display</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event, idx) => (
            <button
              key={event.id}
              onClick={() => setSelectedEvent(event)}
              className={`w-full text-left rounded-lg border-2 p-4 transition hover:shadow-lg cursor-pointer ${getSeverityColor(event.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {getEventIcon(event.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{event.title}</h3>
                      <div className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityBadge(event.severity).bg} ${getSeverityBadge(event.severity).text}`}>
                        {event.severity}
                      </div>
                    </div>
                    <p className="text-sm opacity-75 mt-1">{event.description}</p>
                    <div className="flex flex-wrap gap-4 mt-3 text-xs opacity-60">
                      <span className="flex items-center gap-1">
                        <MapPin size={14} /> {event.ipAddress}
                      </span>
                      {event.location && <span>{event.location}</span>}
                      {event.device && <span>{event.device}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-sm opacity-75">{new Date(event.timestamp).toLocaleDateString()}</p>
                  <p className="text-xs opacity-60">{new Date(event.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Help Section */}
      <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="flex items-center gap-2 font-bold text-blue-900 mb-3">
          <HelpCircle size={20} /> What to do if you see unusual activity?
        </h3>
        <ol className="space-y-2 text-blue-800 text-sm">
          <li className="flex gap-3">
            <span className="font-bold flex-shrink-0">1.</span>
            <span>Change your password immediately if you see unrecognized login attempts</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold flex-shrink-0">2.</span>
            <span>Review your active devices and revoke any you don't recognize</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold flex-shrink-0">3.</span>
            <span>Enable two-factor authentication if you haven't already</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold flex-shrink-0">4.</span>
            <span>Contact support if you believe your account has been compromised</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
