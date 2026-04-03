import { ArrowDownLeft, ArrowUpRight, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Link } from 'react-router';

interface TransactionStatusCardProps {
  id: string;
  type: string;
  reference?: string;
  amount: number;
  fee?: number;
  status: 'pending' | 'success' | 'failed';
  createdAt?: string;
  onRetry?: (id: string) => void;
  onMarkPaid?: (id: string) => void;
}

const statusStyles: Record<TransactionStatusCardProps['status'], string> = {
  success: 'bg-green-50 text-green-700 border-green-200',
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
};

const statusIcon = (status: TransactionStatusCardProps['status']) => {
  if (status === 'success') return <CheckCircle size={16} />;
  if (status === 'failed') return <XCircle size={16} />;
  return <Clock size={16} />;
};

export default function TransactionStatusCard({
  id,
  type,
  reference,
  amount,
  fee,
  status,
  createdAt,
  onRetry,
  onMarkPaid,
}: TransactionStatusCardProps) {
  const isCredit = ['receive', 'topup'].includes(type);
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            {isCredit ? <ArrowDownLeft size={18} className="text-green-600" /> : <ArrowUpRight size={18} className="text-red-600" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{type.toUpperCase()}</p>
            <p className="text-xs text-gray-500">{reference || id}</p>
            {createdAt && (
              <p className="text-xs text-gray-400 mt-1">{new Date(createdAt).toLocaleString()}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900">NGN {Number(amount || 0).toLocaleString()}</p>
          {fee !== undefined && <p className="text-xs text-gray-500">Fee: NGN {Number(fee || 0).toLocaleString()}</p>}
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${statusStyles[status]}`}>
            {statusIcon(status)} {status}
          </span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {status === 'failed' && onRetry && (
          <button
            onClick={() => onRetry(id)}
            className="text-xs font-semibold px-3 py-2 border border-red-200 text-red-700 rounded-full"
          >
            Retry
          </button>
        )}
        {onMarkPaid && (
          <button
            onClick={() => onMarkPaid(id)}
            className="text-xs font-semibold px-3 py-2 border border-gray-200 text-gray-700 rounded-full"
          >
            Mark as paid
          </button>
        )}
        <Link
          to={`/transactions/${id}`}
          className="text-xs font-semibold px-3 py-2 border border-gray-200 text-blue-700 rounded-full"
        >
          View details
        </Link>
        <Link
          to={`/transactions/${id}/receipt`}
          className="text-xs font-semibold px-3 py-2 border border-gray-200 text-blue-700 rounded-full"
        >
          View receipt
        </Link>
      </div>
    </div>
  );
}
