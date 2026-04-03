import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Download, Filter, ArrowLeft } from 'lucide-react';
import { adminAPI } from '../../../services/api';

type AdminTransaction = {
  id: string;
  reference?: string;
  full_name?: string;
  type?: string;
  status?: string;
  amount?: number;
  fee?: number;
  total?: number;
  created_at?: string;
  vtpass_status?: string;
  metadata?: unknown;
};

function toCsv(rows: AdminTransaction[]) {
  const headers = [
    'Reference',
    'Customer',
    'Type',
    'Status',
    'Amount',
    'Fee',
    'Total',
    'Created At',
    'VTpass Status',
  ];
  const lines = rows.map((row) => [
    row.reference,
    row.full_name,
    row.type,
    row.status,
    row.amount,
    row.fee,
    row.total,
    row.created_at,
    row.vtpass_status || '',
  ]);
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [headers, ...lines].map((line) => line.map(escape).join(',')).join('\n');
}

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = (await adminAPI.getTransactions()) as AdminTransaction[] | undefined;
      setTransactions(data || []);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return transactions.filter((row) => {
      const hay = `${row.reference || ''} ${row.full_name || ''}`.toLowerCase();
      if (search && !hay.includes(search.toLowerCase())) return false;
      if (type !== 'all' && row.type !== type) return false;
      if (status !== 'all' && row.status !== status) return false;
      if (from && row.created_at && new Date(row.created_at) < new Date(from)) return false;
      if (to && row.created_at && new Date(row.created_at) > new Date(`${to}T23:59:59`)) return false;
      return true;
    });
  }, [transactions, search, type, status, from, to]);

  const exportCsv = () => {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getMeta = (meta: unknown) => {
    if (!meta) return null;
    if (typeof meta === 'string') {
      try {
        return JSON.parse(meta);
      } catch {
        return meta;
      }
    }
    return meta;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-10">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="text-white">
            <ArrowLeft size={22} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Transactions</h1>
            <p className="text-white/70 text-sm">Monitor and reconcile all user activity</p>
          </div>
        </div>
      </div>

      <div className="px-6 -mt-6 pb-10">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-5 mb-6">
          <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-gray-800 dark:text-gray-200">
            <Filter size={16} />
            Filters
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              placeholder="Search reference or user"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            >
              <option value="all">All types</option>
              <option value="send">Send</option>
              <option value="receive">Receive</option>
              <option value="bill">Bill</option>
              <option value="topup">Topup</option>
              <option value="request">Request</option>
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            >
              <option value="all">All status</option>
              <option value="pending">Pending</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            />
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {filtered.length} transactions
            </p>
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 bg-[#235697] text-white px-3 py-2 rounded-lg text-xs font-semibold"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-5">
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading transactions...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No transactions found.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((txn) => {
                const ref = txn.reference ?? '';
                const metaString: string = txn.metadata
                  ? JSON.stringify(getMeta(txn.metadata), null, 2) ?? ''
                  : '';
                return (
                <div key={txn.id} className="border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {ref || '—'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{txn.full_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        ₦{Number(txn.total || txn.amount || 0).toLocaleString('en-NG', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{txn.status}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => setExpanded(expanded === txn.id ? null : txn.id)}
                      className="text-xs text-[#235697] font-semibold"
                    >
                      {expanded === txn.id ? 'Hide details' : 'View details'}
                    </button>
                    {ref.startsWith('BILL-') && (
                      <button
                        onClick={() =>
                          adminAPI
                            .requeryVtpass(ref.replace('BILL-', ''))
                            .then(load)
                        }
                        className="text-xs text-white bg-[#235697] px-2 py-1 rounded-lg"
                      >
                        Requery
                      </button>
                    )}
                  </div>
                  {expanded === txn.id && (
                    <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      <p>Type: {txn.type}</p>
                      <p>Date: {txn.created_at ? new Date(txn.created_at).toLocaleString() : '—'}</p>
                      {txn.vtpass_status && <p>VTpass status: {txn.vtpass_status}</p>}
                      {txn.metadata != null && (
                        <pre className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg overflow-x-auto">
                          {metaString}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
