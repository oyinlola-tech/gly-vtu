import { useState, useEffect } from 'react';
import { ArrowDown, ArrowUp, Copy, Share2, Download, AlertCircle } from 'lucide-react';

interface TransactionDetailsProps {
  transactionId: string;
}

interface Transaction {
  id: string;
  type: 'topup' | 'transfer' | 'bill_payment' | 'card_funding' | 'withdrawal';
  amount: number;
  fee: number;
  total: number;
  status: 'pending' | 'success' | 'failed';
  reference: string;
  description: string;
  recipient?: {
    name: string;
    account: string;
    bank?: string;
  };
  source?: {
    name: string;
    account: string;
  };
  metadata?: Record<string, any>;
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
}

export function TransactionDetails({ transactionId }: TransactionDetailsProps) {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadTransaction();
  }, [transactionId]);

  async function loadTransaction() {
    try {
      setLoading(true);
      // Fetch transaction details
      // const response = await fetch(`/api/transactions/${transactionId}`);
      // const data = await response.json();
      // setTransaction(data);
      setError(null);
    } catch (err) {
      setError('Failed to load transaction details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const isIncoming = transaction.type === 'topup';
  const isOutgoing = ['transfer', 'bill_payment', 'card_funding', 'withdrawal'].includes(transaction.type);
  const statusColor =
    transaction.status === 'success' ? 'green' :
    transaction.status === 'failed' ? 'red' : 'yellow';

  const typeLabel = {
    topup: 'Wallet Top-up',
    transfer: 'Bank Transfer',
    bill_payment: 'Bill Payment',
    card_funding: 'Card Funding',
    withdrawal: 'Withdrawal'
  }[transaction.type] || transaction.type;

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
          isIncoming ? 'bg-green-100' : 'bg-blue-100'
        }`}>
          {isIncoming ? (
            <ArrowDown className={`w-8 h-8 text-${isIncoming ? 'green' : 'blue'}-600`} />
          ) : (
            <ArrowUp className={`w-8 h-8 text-${isIncoming ? 'green' : 'blue'}-600`} />
          )}
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isIncoming ? '+' : '-'} NGN {(transaction.amount || 0).toLocaleString()}
        </h1>
        <p className="text-gray-600">{typeLabel}</p>
      </div>

      {/* Status Banner */}
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

      {/* Transaction Details */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6 space-y-4">
        <div className="flex justify-between items-center pb-4 border-b">
          <span className="text-gray-600">Transaction Reference</span>
          <div className="flex items-center gap-2">
            <code className="bg-white px-3 py-1 rounded font-mono text-sm">{transaction.reference}</code>
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
          <span className="text-gray-600">Amount</span>
          <span className="font-semibold text-gray-900">NGN {(transaction.amount || 0).toLocaleString()}</span>
        </div>

        {transaction.fee > 0 && (
          <div className="flex justify-between items-center pb-4 border-b">
            <span className="text-gray-600">Fee</span>
            <span className="text-gray-700">NGN {(transaction.fee || 0).toLocaleString()}</span>
          </div>
        )}

        {transaction.fee > 0 && (
          <div className="flex justify-between items-center pb-4 border-b bg-white -m-6 p-6">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="font-semibold text-gray-900">NGN {(transaction.total || 0).toLocaleString()}</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-gray-600">Date & Time</span>
          <span className="text-gray-900">{new Date(transaction.createdAt).toLocaleString()}</span>
        </div>

        {transaction.completedAt && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Completed At</span>
            <span className="text-gray-900">{new Date(transaction.completedAt).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Recipient/Source Info */}
      {(transaction.recipient || transaction.source) && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          {transaction.recipient && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Recipient</p>
              <div className="space-y-2">
                <p className="font-semibold text-gray-900">{transaction.recipient.name}</p>
                <p className="text-gray-700">{transaction.recipient.account}</p>
                {transaction.recipient.bank && (
                  <p className="text-sm text-gray-600">{transaction.recipient.bank}</p>
                )}
              </div>
            </div>
          )}
          {transaction.source && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">From</p>
              <div className="space-y-2">
                <p className="font-semibold text-gray-900">{transaction.source.name}</p>
                <p className="text-gray-700">{transaction.source.account}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
          <Share2 size={18} />
          Share
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
          <Download size={18} />
          Download Receipt
        </button>
      </div>

      {/* Security Note */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>Tip:</strong> Save or download your receipt for your records. This transaction reference can be used to track your payment status.
        </p>
      </div>
    </div>
  );
}
