import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowDown, ArrowUp, Copy, Share2, Download, AlertCircle } from 'lucide-react';
import { transactionsAPI } from '../../services/api';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  fee: number;
  total: number;
  status: 'pending' | 'success' | 'failed';
  reference: string;
  description?: string;
  recipient?: {
    name: string;
    account: string;
    bank?: string;
  };
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
}

export default function TransactionDetailsPage() {
  const { id } = useParams();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadTransaction();
  }, [id]);

  async function loadTransaction() {
    try {
      setLoading(true);
      const data = await transactionsAPI.getById(id as string);
      setTransaction(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load transaction details');
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function downloadReceipt() {
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
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <p className="text-red-800">{error || 'Transaction not found'}</p>
        </div>
      </div>
    );
  }

  const isIncoming = transaction.type === 'topup' || transaction.type === 'receive';
  const typeLabel = transaction.type?.toUpperCase?.() || transaction.type;

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto dark:text-white">
      <div className="mb-6 text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
          isIncoming ? 'bg-green-100' : 'bg-blue-100'
        }`}>
          {isIncoming ? (
            <ArrowDown className="w-8 h-8 text-green-600" />
          ) : (
            <ArrowUp className="w-8 h-8 text-blue-600" />
          )}
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {isIncoming ? '+' : '-'} NGN {(transaction.amount || 0).toLocaleString()}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">{typeLabel}</p>
      </div>

      <div className={`mb-6 p-4 rounded-lg text-white ${
        transaction.status === 'success' ? 'bg-green-600' :
        transaction.status === 'failed' ? 'bg-red-600' : 'bg-yellow-600'
      }`}>
        <p className="font-semibold capitalize">{transaction.status}</p>
        {transaction.status === 'pending' && (
          <p className="text-sm opacity-90">This transaction is being processed</p>
        )}
        {transaction.status === 'failed' && (
          <p className="text-sm opacity-90">{transaction.failureReason || 'Transaction could not be completed'}</p>
        )}
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-6 space-y-4">
        <div className="flex justify-between items-center pb-4 border-b">
          <span className="text-gray-600 dark:text-gray-400">Transaction Reference</span>
          <div className="flex items-center gap-2">
            <code className="bg-white dark:bg-gray-800 px-3 py-1 rounded font-mono text-sm">{transaction.reference}</code>
            <button
              onClick={() => copyToClipboard(transaction.reference)}
              className="p-1 hover:bg-white rounded transition"
              title="Copy"
            >
              <Copy size={18} />
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center pb-4 border-b">
          <span className="text-gray-600 dark:text-gray-400">Amount</span>
          <span className="font-semibold text-gray-900 dark:text-white">NGN {(transaction.amount || 0).toLocaleString()}</span>
        </div>

        {transaction.fee > 0 && (
          <div className="flex justify-between items-center pb-4 border-b">
            <span className="text-gray-600 dark:text-gray-400">Fee</span>
            <span className="text-gray-700 dark:text-gray-300">NGN {(transaction.fee || 0).toLocaleString()}</span>
          </div>
        )}

        {transaction.fee > 0 && (
          <div className="flex justify-between items-center pb-4 border-b bg-white dark:bg-gray-800 -m-6 p-6">
            <span className="font-semibold text-gray-900 dark:text-white">Total</span>
            <span className="font-semibold text-gray-900 dark:text-white">NGN {(transaction.total || 0).toLocaleString()}</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">Date & Time</span>
          <span className="text-gray-900 dark:text-white">{new Date(transaction.createdAt).toLocaleString()}</span>
        </div>
      </div>

      {transaction.recipient && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Recipient</p>
          <div className="space-y-2">
            <p className="font-semibold text-gray-900 dark:text-white">{transaction.recipient.name}</p>
            <p className="text-gray-700 dark:text-gray-300">{transaction.recipient.account}</p>
            {transaction.recipient.bank && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{transaction.recipient.bank}</p>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
          <Share2 size={18} />
          Share
        </button>
        <button
          onClick={downloadReceipt}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          <Download size={18} />
          Download Receipt
        </button>
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-900 dark:text-blue-200">
          <strong>Tip:</strong> Save or download your receipt for your records. This transaction reference can be used to track your payment status.
        </p>
        {copied && <p className="text-xs text-blue-700 mt-2">Reference copied to clipboard.</p>}
        <Link to={`/transactions/${transaction.id}/receipt`} className="text-sm text-blue-700 underline mt-2 inline-block">
          View receipt page
        </Link>
      </div>
    </div>
  );
}
