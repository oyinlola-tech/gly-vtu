import React from 'react';

/**
 * TransactionStatusBadge Component
 * Shows transaction status with appropriate visual styling
 * 
 * Status types: success, pending, failed, disputed
 */

type TransactionStatus = 'success' | 'pending' | 'failed' | 'disputed';
type BadgeSize = 'sm' | 'md' | 'lg';

interface TransactionStatusBadgeProps {
  status: TransactionStatus;
  size?: BadgeSize;
}

const statusConfig: Record<TransactionStatus, { bg: string; text: string; icon: string; label: string }> = {
  success: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    icon: '✓',
    label: 'Successful'
  },
  pending: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    icon: '⏳',
    label: 'Pending'
  },
  failed: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    icon: '✗',
    label: 'Failed'
  },
  disputed: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    icon: '⚠',
    label: 'Disputed'
  }
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base'
};

export function TransactionStatusBadge({ status, size = 'md' }: TransactionStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.bg} ${config.text} ${sizeClasses[size]}`}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}

export default TransactionStatusBadge;