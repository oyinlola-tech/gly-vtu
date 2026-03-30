import React, { useState } from 'react';

/**
 * SecurityAlert Component
 * Displays important security-related alerts to the user
 * 
 * Alert types: info, warning, error, success
 * Actions can be TOTP setup, password change, device verification, etc.
 */

type SecurityAlertType = 'info' | 'warning' | 'error' | 'success';

interface SecurityAlertAction {
  label: string;
  onClick: () => void;
}

interface SecurityAlertProps {
  type?: SecurityAlertType;
  title: string;
  message: string;
  action?: SecurityAlertAction;
  onDismiss?: () => void;
  icon?: React.ReactNode;
  persistent?: boolean;
}

interface SecurityAlertItem extends SecurityAlertProps {
  id: string;
  type: SecurityAlertType;
}

const typeConfig: Record<SecurityAlertType, { bg: string; border: string; text: string; icon: string; accentBg: string }> = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: 'â„¹ï¸',
    accentBg: 'bg-blue-100'
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    icon: 'âš ï¸',
    accentBg: 'bg-yellow-100'
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: 'ðŸš¨',
    accentBg: 'bg-red-100'
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: 'âœ“',
    accentBg: 'bg-green-100'
  }
};

export function SecurityAlert({ 
  type = 'info',
  title,
  message,
  action,
  onDismiss,
  icon,
  persistent = false
}: SecurityAlertProps) {
  const [visible, setVisible] = useState(true);

  const config = typeConfig[type];

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) return null;

  return (
    <div className={`border-l-4 ${config.border} ${config.bg} p-4 rounded-r-lg`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          {/* Icon */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full ${config.accentBg} flex items-center justify-center`}>
            <span className="text-lg">{icon || config.icon}</span>
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className={`font-semibold ${config.text}`}>{title}</h3>
            <p className={`text-sm ${config.text} mt-1 opacity-90`}>{message}</p>

            {/* Action Button */}
            {action && (
              <button
                onClick={action.onClick}
                className={`mt-3 px-3 py-1 text-sm font-medium rounded transition-colors ${
                  type === 'error' 
                    ? 'bg-red-200 hover:bg-red-300 text-red-800'
                    : type === 'warning'
                    ? 'bg-yellow-200 hover:bg-yellow-300 text-yellow-800'
                    : 'bg-blue-200 hover:bg-blue-300 text-blue-800'
                }`}
              >
                {action.label}
              </button>
            )}
          </div>
        </div>

        {/* Close Button */}
        {!persistent && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-lg opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Dismiss alert"
          >
            âœ•
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * SecurityAlertList Component
 * Container for multiple security alerts
 */
export function SecurityAlertList({ alerts = [] }: { alerts?: SecurityAlertItem[] }) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
  };

  const visibleAlerts = alerts.filter(alert => !dismissedIds.has(alert.id));

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-3">
      {visibleAlerts.map(alert => (
        <SecurityAlert
          key={alert.id}
          type={alert.type}
          title={alert.title}
          message={alert.message}
          action={alert.action}
          onDismiss={() => handleDismiss(alert.id)}
          icon={alert.icon}
          persistent={alert.persistent}
        />
      ))}
    </div>
  );
}

export default SecurityAlert;
