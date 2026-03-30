import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  ChevronLeft,
  CheckCircle,
  AlertCircle,
  Clock,
  Copy,
  Download,
} from 'lucide-react';
import { transactionsAPI } from '../../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function TransactionDetails() {
  const { id } = useParams();
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    transactionsAPI
      .getById(id)
      .then((data) => setTransaction(data))
      .catch(() => setError('Transaction not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const formatAmount = (amount: number) =>
    `₦${Number(amount || 0).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const statusTone = (status: string) => {
    if (status === 'success') return 'bg-green-50 text-green-700 border-green-200';
    if (status === 'failed') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  };

  const statusIcon = (status: string) => {
    if (status === 'success') return <CheckCircle size={18} />;
    if (status === 'failed') return <AlertCircle size={18} />;
    return <Clock size={18} />;
  };

  const copyText = (value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value).catch(() => null);
  };

  const downloadReceipt = async () => {
    if (!transaction?.id) return;
    const blob = await transactionsAPI.downloadReceipt(transaction.id);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `glyvtu-receipt-${transaction.reference || transaction.id}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-10">
        <div className="flex items-center gap-4">
          <Link to="/transactions" className="text-white">
            <ChevronLeft size={24} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Transaction Details</h1>
            <p className="text-white/70 text-sm">Full receipt and status</p>
          </div>
        </div>
      </div>

      <div className="px-6 -mt-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : error || !transaction ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 text-center text-sm text-gray-500">
            {error || 'Transaction not found'}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 space-y-6">
            <div className={`border rounded-xl p-4 flex items-center justify-between ${statusTone(transaction.status)}`}>
              <div className="flex items-center gap-2 font-semibold capitalize">
                {statusIcon(transaction.status)}
                {transaction.status}
              </div>
              <span className="text-xs">
                {transaction.status === 'success' ? '✓ Confirmed' : 'Pending confirmation'}
              </span>
            </div>

            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Amount</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatAmount(transaction.amount)}
                </p>
                {Number(transaction.fee || 0) > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    + {formatAmount(transaction.fee)} fee
                  </p>
                )}
              </div>
            </div>

            {transaction.recipient?.name && (
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Recipient</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {transaction.recipient.name}
                </p>
                {transaction.recipient.account && (
                  <button
                    onClick={() => copyText(transaction.recipient.account)}
                    className="mt-1 text-xs text-[#235697] inline-flex items-center gap-1"
                  >
                    {transaction.recipient.account}
                    <Copy size={12} />
                  </button>
                )}
                {transaction.recipient.bank && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {transaction.recipient.bank}
                  </p>
                )}
              </div>
            )}

            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Reference</p>
                <button
                  onClick={() => copyText(transaction.reference)}
                  className="font-mono text-xs text-[#235697] inline-flex items-center gap-1"
                >
                  {transaction.reference}
                  <Copy size={12} />
                </button>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Type</p>
                <p className="capitalize text-gray-900 dark:text-white">{transaction.type}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
                <p className="text-gray-900 dark:text-white">
                  {transaction.createdAt ? new Date(transaction.createdAt).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 flex gap-2">
              <button
                className="flex-1 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200 py-2 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2"
                onClick={downloadReceipt}
              >
                <Download size={14} />
                Receipt (PDF)
              </button>
              <button
                className="flex-1 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200 py-2 rounded-xl text-sm font-semibold"
                onClick={() => copyText(transaction.reference)}
              >
                Share
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
