import type { ComponentType } from 'react';
import { AlertTriangle, CheckCircle, Lock, LogIn, LogOut, Shield } from 'lucide-react';

interface ActivityEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  ipAddress?: string;
  userAgent?: string;
}

const iconMap: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  'auth.login': LogIn,
  'auth.logout': LogOut,
  'password.changed': Lock,
  'totp.enabled': Shield,
  'totp.disabled': AlertTriangle,
  'device.verified': CheckCircle,
  'device.revoked': AlertTriangle,
};

const severityTone = (severity?: ActivityEvent['severity']) => {
  if (severity === 'critical') return 'border-red-300 bg-red-50 text-red-900';
  if (severity === 'high') return 'border-red-200 bg-red-50 text-red-900';
  if (severity === 'medium') return 'border-yellow-200 bg-yellow-50 text-yellow-900';
  if (severity === 'low') return 'border-green-200 bg-green-50 text-green-900';
  return 'border-gray-200 bg-white text-gray-900';
};

export default function ActivityTimeline({ events }: { events: ActivityEvent[] }) {
  if (!events.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center text-sm text-gray-500">
        No recent security activity.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const Icon = iconMap[event.type] || Shield;
        return (
          <div
            key={event.id}
            className={`border rounded-2xl p-4 flex items-start gap-3 ${severityTone(event.severity)}`}
          >
            <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center border border-white/60">
              <Icon size={18} className="text-[#235697]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm">{event.title}</p>
                  {event.description && (
                    <p className="text-xs opacity-80 mt-1">{event.description}</p>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(event.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-3">
                {event.ipAddress && <span>IP: {event.ipAddress}</span>}
                {event.userAgent && <span>{event.userAgent}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
