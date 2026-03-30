import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  LogOut,
  BellRing,
  MessageCircle,
} from 'lucide-react';
import { adminAPI, tokenStore } from '../../../services/api';
import type { AdminBillPricing, AdminBillProvider } from '../../../types/bills';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    walletBalance: 0,
    users: 0,
    volume: 0,
    revenue: 0,
  });
  const [users, setUsers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [pricing, setPricing] = useState<AdminBillPricing[]>([]);
  const [providers, setProviders] = useState<AdminBillProvider[]>([]);
  const [providerSaving, setProviderSaving] = useState<string | number | null>(null);
  const [pricingSaving, setPricingSaving] = useState<string | number | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState('');
  const [notification, setNotification] = useState({
    title: '',
    body: '',
    force: true,
  });
  const [vtpassEvents, setVtpassEvents] = useState<any[]>([]);
  const [vtpassStatus, setVtpassStatus] = useState('all');
  const [vtpassLoading, setVtpassLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    loadDashboard();
    connectWs();
    return () => wsRef.current?.close();
  }, []);

  const connectWs = () => {
    const token = tokenStore.getAdminToken();
    if (!token) return;
    const wsUrl = import.meta.env.VITE_WS_URL || `${window.location.origin.replace('http', 'ws')}/ws`;
    const ws = new WebSocket(`${wsUrl}?token=${encodeURIComponent(token)}&role=admin`);
    wsRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.type === 'chat.message') {
          const msg = payload.message;
          if (selectedConversation?.id === msg.conversationId) {
            setMessages((prev) => [...prev, msg]);
          }
          loadConversations();
        }
      } catch {
        // ignore
      }
    };
  };

  const loadDashboard = async () => {
    try {
      const [overview, usersRes, txRes, convoRes, pricingRes, providerRes] = await Promise.all([
        adminAPI.getFinanceOverview(),
        adminAPI.getUsers(),
        adminAPI.getTransactions(),
        adminAPI.getConversations(),
        adminAPI.getBillPricing(),
        adminAPI.getBillProviders(),
      ]);
      setStats({
        walletBalance: Number(overview.walletBalance || 0),
        users: Number(overview.users || 0),
        volume: Number(overview.volume || 0),
        revenue: Number(overview.revenue || 0),
      });
      setUsers(usersRes || []);
      setTransactions(txRes || []);
      setConversations(convoRes || []);
      setPricing(pricingRes || []);
      setProviders(providerRes || []);
      if (convoRes?.length && !selectedConversation) {
        setSelectedConversation(convoRes[0]);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard');
    }
  };

  const loadConversations = async () => {
    try {
      const convoRes = await adminAPI.getConversations();
      setConversations(convoRes || []);
      if (!selectedConversation && convoRes?.length) {
        setSelectedConversation(convoRes[0]);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!selectedConversation?.id) return;
    adminAPI
      .getConversationMessages(selectedConversation.id)
      .then((data) => setMessages(data || []))
      .catch(() => setMessages([]));
  }, [selectedConversation?.id]);

  const handleLogout = () => {
    adminAPI.logout().catch(() => null);
    navigate('/admin/login');
  };

  const statCards = [
    {
      icon: DollarSign,
      label: 'Wallet Balance',
      value: `₦${stats.walletBalance.toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      color: 'bg-green-500',
    },
    {
      icon: Users,
      label: 'Total Users',
      value: stats.users.toLocaleString(),
      color: 'bg-blue-500',
    },
    {
      icon: TrendingUp,
      label: 'Volume',
      value: `₦${stats.volume.toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      color: 'bg-purple-500',
    },
    {
      icon: Activity,
      label: 'Revenue',
      value: `₦${stats.revenue.toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      color: 'bg-orange-500',
    },
  ];

  const recentUsers = useMemo(() => users.slice(0, 5), [users]);
  const recentTransactions = useMemo(() => transactions.slice(0, 10), [transactions]);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const getTxnMeta = (meta: any) => {
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
  const dataPricing = useMemo(
    () => pricing.filter((row) => row.category_code === 'data'),
    [pricing]
  );

  const sendNotification = async () => {
    if (!notification.title || !notification.body) return;
    try {
      await adminAPI.sendNotification({
        title: notification.title,
        body: notification.body,
        force: notification.force,
      });
      setNotification({ title: '', body: '', force: true });
    } catch {
      // ignore
    }
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedConversation?.id) return;
    const text = reply.trim();
    setReply('');
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'chat.send',
          text,
          conversationId: selectedConversation.id,
          userId: selectedConversation.user_id,
        })
      );
    } else {
      await adminAPI.sendConversationMessage(selectedConversation.id, text);
      const data = await adminAPI.getConversationMessages(selectedConversation.id);
      setMessages(data || []);
    }
  };

  const handlePricingChange = (
    id: string | number,
    field: keyof AdminBillPricing,
    value: AdminBillPricing[keyof AdminBillPricing]
  ) => {
    setPricing((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const savePricing = async (row: AdminBillPricing) => {
    setPricingSaving(row.id);
    try {
      await adminAPI.updateBillPricing(String(row.id), {
        baseFee: Number(row.base_fee || 0),
        markupType: row.markup_type || 'flat',
        markupValue: Number(row.markup_value || 0),
        currency: row.currency || 'NGN',
        active: !!row.active,
      });
    } catch {
      // ignore
    } finally {
      setPricingSaving(null);
    }
  };

  const handleProviderChange = (
    id: string | number,
    field: keyof AdminBillProvider,
    value: AdminBillProvider[keyof AdminBillProvider]
  ) => {
    setProviders((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const saveProvider = async (row: AdminBillProvider) => {
    setProviderSaving(row.id);
    try {
      await adminAPI.updateBillProvider(String(row.id), {
        name: row.name,
        code: row.code,
        logoUrl: row.logo_url || '',
        active: !!row.active,
      });
    } catch {
      // ignore
    } finally {
      setProviderSaving(null);
    }
  };

  const loadVtpassEvents = async () => {
    setVtpassLoading(true);
    try {
      const status = vtpassStatus === 'all' ? undefined : vtpassStatus;
      const rows = await adminAPI.getVtpassEvents({ limit: 50, status });
      setVtpassEvents(rows || []);
    } catch {
      setVtpassEvents([]);
    } finally {
      setVtpassLoading(false);
    }
  };

  useEffect(() => {
    loadVtpassEvents();
  }, [vtpassStatus]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Admin Dashboard</h1>
            <p className="text-white/80 text-sm">GLY VTU Operations</p>
          </div>
          <button onClick={handleLogout} className="text-white/80 hover:text-white flex items-center gap-2">
            <LogOut size={20} />
            <span className="text-sm">Logout</span>
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div key={card.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className={`${card.color} w-10 h-10 rounded-full flex items-center justify-center mb-3`}>
                <card.icon size={20} className="text-white" />
              </div>
              <p className="text-white/80 text-xs mb-1">{card.label}</p>
              <p className="text-white text-xl font-bold">{card.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Transactions</h2>
            </div>
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No transactions yet.</p>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((txn) => (
                  <div key={txn.id} className="border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{txn.reference}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{txn.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">
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
                        onClick={() => setExpandedTx(expandedTx === txn.id ? null : txn.id)}
                        className="text-xs text-[#235697] font-semibold"
                      >
                        {expandedTx === txn.id ? 'Hide details' : 'View details'}
                      </button>
                      {txn.reference?.startsWith('BILL-') && (
                        <button
                          onClick={() =>
                            adminAPI
                              .requeryVtpass(txn.reference.replace('BILL-', ''))
                              .then(loadDashboard)
                          }
                          className="text-xs text-white bg-[#235697] px-2 py-1 rounded-lg"
                        >
                          Requery
                        </button>
                      )}
                    </div>
                    {expandedTx === txn.id && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        <p>Customer: {txn.full_name}</p>
                        {txn.vtpass_status && (
                          <p>VTpass status: {txn.vtpass_status}</p>
                        )}
                        {txn.metadata && (
                          <pre className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg overflow-x-auto">
                            {JSON.stringify(getTxnMeta(txn.metadata), null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">New Users</h2>
            {recentUsers.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No users yet.</p>
            ) : (
              <div className="space-y-3">
                {recentUsers.map((usr) => (
                  <div key={usr.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{usr.full_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{usr.email}</p>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(usr.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <BellRing size={18} className="text-[#235697]" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Force Notification</h2>
            </div>
            <div className="space-y-3">
              <input
                value={notification.title}
                onChange={(e) => setNotification((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                placeholder="Title"
              />
              <textarea
                value={notification.body}
                onChange={(e) => setNotification((prev) => ({ ...prev, body: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm h-24"
                placeholder="Message"
              />
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={notification.force}
                  onChange={(e) => setNotification((prev) => ({ ...prev, force: e.target.checked }))}
                />
                Force push notification
              </label>
              <button
                onClick={sendNotification}
                className="w-full bg-[#235697] text-white py-2 rounded-lg text-sm font-semibold hover:opacity-90"
              >
                Send Notification
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle size={18} className="text-[#235697]" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Support Inbox</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 space-y-2 max-h-80 overflow-y-auto">
                {conversations.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No conversations yet.</p>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`w-full text-left p-3 rounded-xl border ${
                        selectedConversation?.id === conv.id
                          ? 'border-[#235697] bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-800'
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {conv.full_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{conv.email}</p>
                    </button>
                  ))
                )}
              </div>
              <div className="md:col-span-2 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col">
                <div className="flex-1 space-y-3 max-h-64 overflow-y-auto">
                  {messages.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Select a conversation to view messages.</p>
                  ) : (
                    messages.map((msg) => {
                      const senderType = msg.sender_type || msg.senderType;
                      return (
                      <div
                        key={msg.id}
                        className={`flex ${senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`px-3 py-2 rounded-xl text-sm ${
                            senderType === 'admin'
                              ? 'bg-[#235697] text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                          }`}
                        >
                          {msg.body}
                        </div>
                      </div>
                    )})
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    placeholder="Type a reply..."
                  />
                  <button
                    onClick={sendReply}
                    className="bg-[#235697] text-white px-4 rounded-lg text-sm font-semibold"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Bill Providers</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Update provider name, code, logo and availability
            </span>
          </div>
          {providers.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No providers found.</p>
          ) : (
            <div className="space-y-4">
              {providers.map((row) => (
                <div
                  key={row.id}
                  className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 grid grid-cols-1 lg:grid-cols-6 gap-3 items-center"
                >
                  <div className="lg:col-span-2">
                    <input
                      value={row.name}
                      onChange={(e) => handleProviderChange(row.id, 'name', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold"
                      placeholder="Provider name"
                    />
                    <input
                      value={row.code}
                      onChange={(e) => handleProviderChange(row.id, 'code', e.target.value)}
                      className="w-full mt-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                      placeholder="Provider code"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{row.category_name}</p>
                  </div>
                  <div className="lg:col-span-3">
                    <label className="text-xs text-gray-500 dark:text-gray-400">Logo URL</label>
                    <input
                      value={row.logo_url || ''}
                      onChange={(e) => handleProviderChange(row.id, 'logo_url', e.target.value)}
                      className="w-full px-3 py-2 mt-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <input
                        type="checkbox"
                        checked={!!row.active}
                        onChange={(e) => handleProviderChange(row.id, 'active', e.target.checked)}
                      />
                      Active
                    </label>
                    <button
                      onClick={() => saveProvider(row)}
                      className="ml-auto bg-[#235697] text-white px-4 py-2 rounded-lg text-xs font-semibold"
                      disabled={providerSaving === row.id}
                    >
                      {providerSaving === row.id ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Data Pricing</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Manage data bundle pricing and markups
            </span>
          </div>
          {dataPricing.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No data pricing rules yet.</p>
          ) : (
            <div className="space-y-4">
              {dataPricing.map((row) => (
                <div
                  key={row.id}
                  className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 grid grid-cols-1 lg:grid-cols-6 gap-3 items-center"
                >
                  <div className="lg:col-span-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{row.provider}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{row.provider_code}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">Base Fee</label>
                    <input
                      type="number"
                      value={row.base_fee}
                      onChange={(e) =>
                        handlePricingChange(row.id, 'base_fee', e.target.value)
                      }
                      className="w-full px-3 py-2 mt-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">Markup Type</label>
                    <select
                      value={row.markup_type}
                      onChange={(e) =>
                        handlePricingChange(row.id, 'markup_type', e.target.value)
                      }
                      className="w-full px-3 py-2 mt-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    >
                      <option value="flat">Flat</option>
                      <option value="percent">Percent</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">Markup Value</label>
                    <input
                      type="number"
                      value={row.markup_value}
                      onChange={(e) =>
                        handlePricingChange(row.id, 'markup_value', e.target.value)
                      }
                      className="w-full px-3 py-2 mt-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <input
                        type="checkbox"
                        checked={!!row.active}
                        onChange={(e) =>
                          handlePricingChange(row.id, 'active', e.target.checked)
                        }
                      />
                      Active
                    </label>
                    <button
                      onClick={() => savePricing(row)}
                      className="ml-auto bg-[#235697] text-white px-4 py-2 rounded-lg text-xs font-semibold"
                      disabled={pricingSaving === row.id}
                    >
                      {pricingSaving === row.id ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">VTpass Bills Status</h2>
            <div className="flex items-center gap-2">
              <select
                value={vtpassStatus}
                onChange={(e) => setVtpassStatus(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="success">Delivered</option>
                <option value="failed">Failed</option>
              </select>
              <button
                onClick={loadVtpassEvents}
                className="bg-[#235697] text-white px-3 py-2 rounded-lg text-xs font-semibold"
              >
                Refresh
              </button>
            </div>
          </div>
          {vtpassLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading events...</p>
          ) : vtpassEvents.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No VTpass events yet.</p>
          ) : (
            <div className="space-y-3">
              {vtpassEvents.map((event) => (
                <div
                  key={event.request_id}
                  className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center gap-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {event.request_id}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Transaction ID: {event.transaction_id || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Status: <span className="font-semibold">{event.status}</span>
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {event.updated_at ? new Date(event.updated_at).toLocaleString() : ''}
                  </div>
                  <button
                    onClick={() => adminAPI.requeryVtpass(event.request_id).then(loadVtpassEvents)}
                    className="bg-[#235697] text-white px-3 py-2 rounded-lg text-xs font-semibold"
                  >
                    Requery
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
