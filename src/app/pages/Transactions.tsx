import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronLeft, Search, Download, Send, Plus } from 'lucide-react';
import { walletAPI } from '../../services/api';
import BottomNav from '../components/BottomNav';
import Breadcrumbs from '../components/Breadcrumbs';
import type { Transaction } from '../../types/api';

export default function Transactions() {
  const navigate = useNavigate();
  type Direction = 'credit' | 'debit';
  type NormalizedTransaction = Transaction & {
    direction: Direction;
    recipient?: string;
    description?: string;
    timestamp: string;
  };
  const [transactions, setTransactions] = useState<NormalizedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | Direction>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadTransactions = useCallback(async () => {
    try {
      const response = await walletAPI.getTransactions();
      const normalized = ((response || []) as Transaction[]).map((txn) => {
        let metadata: unknown = txn.metadata;
        if (typeof metadata === 'string') {
          try {
            metadata = JSON.parse(metadata);
          } catch {
            metadata = {};
          }
        }
        const meta = (metadata && typeof metadata === 'object') ? (metadata as Record<string, unknown>) : {};
        const direction: Direction =
          txn.type === 'receive' || txn.type === 'topup' ? 'credit' : 'debit';
        const recipient =
          (meta.provider as string) ||
          (meta.accountName as string) ||
          (meta.accountNumber as string) ||
          (meta.to as string) ||
          (meta.from as string) ||
          txn.type;
        return {
          ...txn,
          direction,
          recipient,
          description: (meta.provider as string) || (meta.to as string) || (meta.accountNumber as string) || txn.type,
          timestamp: txn.created_at,
        };
      });
      setTransactions(normalized);
    } catch {
      console.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const filteredTransactions = transactions.filter((txn) => {
    const matchesFilter = filter === 'all' || txn.direction === filter;
    const matchesSearch =
      searchQuery === '' ||
      String(txn.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(txn.recipient || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const formatAmount = (amount: number, type: string) => {
    const prefix = type === 'credit' ? '+' : '-';
    return `${prefix}₦${amount.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return 'TODAY';
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'YESTERDAY';
    } else {
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).toUpperCase();
    }
  };

  const groupedTransactions = filteredTransactions.reduce<Record<string, NormalizedTransaction[]>>((groups, txn) => {
    const date = formatDate(txn.timestamp);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(txn);
    return groups;
  }, {});

  return (
    <div className="min-h-screen fintech-bg pb-32">
      <div className="bg-gradient-to-br from-[#235697] via-[#1a4a86] to-[#0b2c57] p-6 pb-8 sticky top-0 z-30 backdrop-blur shadow-[0_20px_45px_rgba(15,23,42,0.3)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-white" aria-label="Back to dashboard">
              <ChevronLeft size={24} />
            </Link>
            <h1 className="text-xl font-bold text-white">Transactions</h1>
          </div>
          <button className="text-white" aria-label="Download transactions">
            <Download size={24} />
          </button>
        </div>
        <div className="text-white/80 text-xs mb-4">
          <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Transactions' }]} />
        </div>
        <div className="flex items-center gap-2 mb-4">
          <Link
            to="/send"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/15 text-white text-xs font-semibold"
          >
            <Send size={14} />
            Send Money
          </Link>
          <Link
            to="/add-money"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/15 text-white text-xs font-semibold"
          >
            <Plus size={14} />
            Add Funds
          </Link>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transactions..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:bg-white/20"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'credit', label: 'Incoming' },
            { key: 'debit', label: 'Outgoing' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as 'all' | Direction)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-white text-[#235697]'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 pt-6">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="fintech-card rounded-xl p-4">
                <div className="h-4 w-40 bg-gray-200 dark:bg-gray-800 rounded mb-3" />
                <div className="h-3 w-64 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
                <div className="h-3 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
              </div>
            ))}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTransactions).map(([date, txns]) => (
              <div key={date}>
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3">
                  {date}
                </h3>
                <div className="space-y-2">
                  {txns.map((txn) => (
                    <button
                      key={txn.id}
                      onClick={() => navigate(`/transaction/${txn.id}`)}
                      className="w-full fintech-card rounded-xl p-4 flex items-center gap-4 hover:shadow-lg transition-shadow"
                    >
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          txn.direction === 'credit'
                            ? 'bg-green-100 dark:bg-green-900/20'
                            : 'bg-red-100 dark:bg-red-900/20'
                        }`}
                      >
                        <span className="text-xl">
                          {txn.direction === 'credit' ? '↓' : '↑'}
                        </span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">
                          {txn.recipient || 'Transaction'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(txn.timestamp).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </p>
                      </div>
                      <p
                        className={`font-bold ${
                          txn.direction === 'credit' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {formatAmount(Number(txn.total || txn.amount || 0), txn.direction)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
