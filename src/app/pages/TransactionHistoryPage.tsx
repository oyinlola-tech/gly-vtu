import { useState, useEffect, useCallback } from 'react';
import { ArrowDown, ArrowUp, Filter, Download, Search } from 'lucide-react';
import { userAPI } from '../../services/api';
import type { Transaction as ApiTransaction } from '../../types/api';
import TransactionStatusCard from '../components/TransactionStatusCard';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  type: 'topup' | 'transfer' | 'bill_payment' | 'withdrawal';
  amount: number;
  fee: number;
  total: number;
  status: 'pending' | 'success' | 'failed';
  description: string;
  reference: string;
  createdAt: string;
  completedAt?: string;
}

export function TransactionHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const normalizeTransaction = (row: ApiTransaction): Transaction => {
    const total = row.total ?? (row.amount || 0) + (row.fee || 0);
    return {
      id: row.id,
      type: (row.type as Transaction['type']) || 'transfer',
      amount: row.amount || 0,
      fee: row.fee || 0,
      total,
      status: (row.status as Transaction['status']) || 'pending',
      description: row.description || '',
      reference: row.reference || row.id,
      createdAt: row.created_at || row.createdAt || new Date().toISOString(),
      completedAt: row.completed_at || row.completedAt,
    };
  };

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const data = (await userAPI.getTransactions?.()) || [];
      setTransactions((data as ApiTransaction[]).map(normalizeTransaction));
      setError(null);
    } catch {
      setError('Failed to load transactions');
      console.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const filteredTransactions = transactions.filter(tx => {
    if (filters.type && tx.type !== filters.type) return false;
    if (filters.status && tx.status !== filters.status) return false;
    if (filters.search && !tx.description.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.dateFrom && new Date(tx.createdAt) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(tx.createdAt) > new Date(filters.dateTo)) return false;
    return true;
  });

  async function handleExport() {
    try {
      const csv = [
        ['Date', 'Type', 'Amount', 'Fee', 'Status', 'Reference', 'Description'],
        ...filteredTransactions.map(tx => [
          new Date(tx.createdAt).toISOString().split('T')[0],
          tx.type,
          tx.amount,
          tx.fee,
          tx.status,
          tx.reference,
          tx.description,
        ]),
      ]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch {
      setError('Failed to export transactions');
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'topup': return <ArrowDown className="text-green-600" />;
      case 'transfer': return <ArrowUp className="text-blue-600" />;
      case 'bill_payment': return <ArrowUp className="text-purple-600" />;
      case 'withdrawal': return <ArrowUp className="text-red-600" />;
      default: return <ArrowDown className="text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'failed': return 'text-red-600 bg-red-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const typeLabel = {
    topup: 'Wallet Top-up',
    transfer: 'Bank Transfer',
    bill_payment: 'Bill Payment',
    withdrawal: 'Withdrawal',
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
          <p className="text-gray-600 mt-1">View all your transactions and export data</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Download size={18} />
          Export
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="mb-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          <Filter size={18} />
          {showFilters ? 'Hide' : 'Show'} Filters
        </button>

        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="txnSearch" className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  id="txnSearch"
                  type="text"
                  placeholder="Reference or description"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="txnType" className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                id="txnType"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="topup">Wallet Top-up</option>
                <option value="transfer">Bank Transfer</option>
                <option value="bill_payment">Bill Payment</option>
                <option value="withdrawal">Withdrawal</option>
              </select>
            </div>

            <div>
              <label htmlFor="txnStatus" className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                id="txnStatus"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="success">Success</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label htmlFor="txnFrom" className="block text-sm font-medium text-gray-700 mb-2">From</label>
                <input
                  id="txnFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="txnTo" className="block text-sm font-medium text-gray-700 mb-2">To</label>
                <input
                  id="txnTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-2">No transactions found</p>
          {Object.values(filters).some(f => f) && (
            <button
              onClick={() => setFilters({ type: '', status: '', dateFrom: '', dateTo: '', search: '' })}
              className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid gap-3 p-4 sm:hidden">
            {filteredTransactions.map((tx) => (
              <TransactionStatusCard
                key={tx.id}
                id={tx.id}
                type={tx.type}
                reference={tx.reference}
                amount={tx.amount}
                fee={tx.fee}
                status={tx.status}
                createdAt={tx.createdAt}
                onRetry={tx.status === 'failed' ? () => toast.message('Retry queued') : undefined}
                onMarkPaid={() =>
                  toast('Marked as paid', {
                    action: {
                      label: 'Undo',
                      onClick: () => toast.message('Undo complete'),
                    },
                  })
                }
              />
            ))}
          </div>

          <div className="overflow-x-auto hidden sm:block">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Description</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Amount</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Fee</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(tx.type)}
                        <span className="text-sm font-medium text-gray-900">
                          {typeLabel[tx.type as keyof typeof typeLabel]}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700">{tx.description}</p>
                      <p className="text-xs text-gray-500">{tx.reference}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-semibold text-gray-900">NGN {tx.amount.toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm text-gray-600">NGN {tx.fee.toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(tx.status)}`}>
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{new Date(tx.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleTimeString()}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <a href={`/transactions/${tx.id}`} className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
                          View
                        </a>
                        <a href={`/transactions/${tx.id}/receipt`} className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
                          Receipt
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Footer */}
          <div className="bg-gray-50 border-t px-6 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{filteredTransactions.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">
                  NGN {filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Fees</p>
                <p className="text-2xl font-bold text-gray-900">
                  NGN {filteredTransactions.reduce((sum, tx) => sum + tx.fee, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
