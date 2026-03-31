import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Download, ReceiptText } from 'lucide-react';
import { transactionsAPI } from '../../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'sonner';
import Breadcrumbs from '../components/Breadcrumbs';

export default function TransactionReceipt() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    transactionsAPI
      .getById(id)
      .then((data) => {
        setTransaction(data);
        setError(null);
      })
      .catch((err) => {
        setError(err?.message || 'Failed to load transaction');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownload = async () => {
    if (!id) return;
    try {
      const blob = await transactionsAPI.downloadReceipt(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transaction-receipt-${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to download receipt');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <p className="text-gray-700 mb-4">{error || 'Transaction not found'}</p>
          <Link to="/transactions" className="text-blue-600 font-semibold">
            Back to transactions
          </Link>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-6 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Breadcrumbs items={[{ label: 'Transactions', href: '/transactions' }, { label: 'Receipt' }]} />
        <div className="flex items-center justify-between">
          <Link to="/transactions" className="text-sm text-blue-600 flex items-center gap-2">
            <ArrowLeft size={16} />
            Back to transactions
          </Link>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold"
          >
            <Download size={16} />
            Download PDF
          </button>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <ReceiptText size={18} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Transaction Receipt</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{transaction.reference}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-900 dark:text-gray-100">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Status</p>
              <p className="font-semibold text-gray-900">{String(transaction.status || '').toUpperCase()}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Type</p>
              <p className="font-semibold text-gray-900">{String(transaction.type || '').toUpperCase()}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Amount</p>
              <p className="font-semibold text-gray-900">NGN {Number(transaction.amount || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Fee</p>
              <p className="font-semibold text-gray-900">NGN {Number(transaction.fee || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Total</p>
              <p className="font-semibold text-gray-900">NGN {Number(transaction.total || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Date</p>
              <p className="font-semibold text-gray-900">
                {transaction.createdAt ? new Date(transaction.createdAt).toLocaleString() : '—'}
              </p>
            </div>
          </div>

          {transaction.recipient && (
          <div className="mt-6 border-t border-gray-200 dark:border-gray-800 pt-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Recipient</h2>
              <p className="text-sm text-gray-700 dark:text-gray-200">{transaction.recipient.name || '—'}</p>
              {transaction.recipient.account && (
                <p className="text-xs text-gray-500 dark:text-gray-400">Account: {transaction.recipient.account}</p>
              )}
              {transaction.recipient.bank && (
                <p className="text-xs text-gray-500 dark:text-gray-400">Bank: {transaction.recipient.bank}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
