import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronLeft, Filter, Search, Download } from 'lucide-react';
import { walletAPI } from '../../services/api';
import BottomNav from '../components/BottomNav';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Transactions() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const response = await walletAPI.getTransactions();
      const normalized = (response || []).map((txn: any) => {
        let metadata: any = txn.metadata;
        if (typeof metadata === 'string') {
          try {
            metadata = JSON.parse(metadata);
          } catch {
            metadata = {};
          }
        }
        const direction =
          txn.type === 'receive' || txn.type === 'topup' ? 'credit' : 'debit';
        const recipient =
          metadata?.provider ||
          metadata?.accountName ||
          metadata?.accountNumber ||
          metadata?.to ||
          metadata?.from ||
          txn.type;
        return {
          ...txn,
          direction,
          recipient,
          description: metadata?.provider || metadata?.to || metadata?.accountNumber || txn.type,
          timestamp: txn.created_at,
        };
      });
      setTransactions(normalized);
    } catch (err) {
      console.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

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

  const groupedTransactions = filteredTransactions.reduce((groups: any, txn) => {
    const date = formatDate(txn.timestamp);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(txn);
    return groups;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-white">
              <ChevronLeft size={24} />
            </Link>
            <h1 className="text-xl font-bold text-white">Transactions</h1>
          </div>
          <button className="text-white">
            <Download size={24} />
          </button>
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
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:bg-white/20"
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
              onClick={() => setFilter(tab.key as any)}
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
          <div className="flex justify-center py-12">
            <LoadingSpinner />
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
            {Object.entries(groupedTransactions).map(([date, txns]: [string, any]) => (
              <div key={date}>
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3">
                  {date}
                </h3>
                <div className="space-y-2">
                  {txns.map((txn: any) => (
                    <button
                      key={txn.id}
                      onClick={() => navigate(`/transaction/${txn.id}`)}
                      className="w-full bg-white dark:bg-gray-900 rounded-xl p-4 flex items-center gap-4 shadow hover:shadow-md transition-shadow"
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
