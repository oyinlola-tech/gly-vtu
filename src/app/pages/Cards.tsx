import { Link } from 'react-router';
import { useEffect, useState } from 'react';
import { ChevronLeft, CreditCard, Plus, Lock, MoreVertical, Eye } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { cardsAPI } from '../../services/api';

export default function Cards() {
  const virtualCardProvider = (import.meta.env.VITE_VIRTUAL_CARD_PROVIDER || '').trim();
  const virtualCardStatus = (import.meta.env.VITE_VIRTUAL_CARD_STATUS || 'coming_soon').toLowerCase();
  const virtualCardReady = virtualCardStatus === 'live';
  const [cards, setCards] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [settings, setSettings] = useState({
    dailyLimit: '',
    monthlyLimit: '',
    merchantLocks: '',
    autoFreeze: true,
  });

  const loadCards = async () => {
    try {
      const data = await cardsAPI.list();
      setCards(data || []);
    } catch {
      setCards([]);
    }
  };

  useEffect(() => {
    loadCards();
  }, []);

  const handleCreate = async () => {
    if (!amount) return;
    setLoading(true);
    setError('');
    try {
      await cardsAPI.create(Number(amount));
      setAmount('');
      await loadCards();
    } catch (err) {
      setError('Unable to create card. Complete KYC and ensure enough balance.');
    } finally {
      setLoading(false);
    }
  };

  const toggleFreeze = async (card: any) => {
    try {
      if (card.status === 'frozen') {
        await cardsAPI.unfreeze(card.card_id);
      } else {
        await cardsAPI.freeze(card.card_id);
      }
      await loadCards();
    } catch {
      // ignore
    }
  };

  const openSettings = async (card: any) => {
    try {
      const data = await cardsAPI.getSettings(card.card_id);
      setSettings({
        dailyLimit: data?.daily_limit ?? '',
        monthlyLimit: data?.monthly_limit ?? '',
        merchantLocks: data?.merchant_locks ?? '',
        autoFreeze: data?.auto_freeze ? true : false,
      });
    } catch {
      setSettings({
        dailyLimit: '',
        monthlyLimit: '',
        merchantLocks: '',
        autoFreeze: true,
      });
    }
    setSelectedCard(card);
    setSettingsOpen(true);
  };

  const saveSettings = async () => {
    if (!selectedCard) return;
    await cardsAPI.updateSettings(selectedCard.card_id, {
      dailyLimit: settings.dailyLimit ? Number(settings.dailyLimit) : null,
      monthlyLimit: settings.monthlyLimit ? Number(settings.monthlyLimit) : null,
      merchantLocks: settings.merchantLocks || '',
      autoFreeze: settings.autoFreeze,
    });
    setSettingsOpen(false);
  };

  const cardFeatures = [
    {
      icon: Lock,
      title: 'Secure Payments',
      description: 'Protected by advanced encryption',
    },
    {
      icon: CreditCard,
      title: 'Virtual Card',
      description: virtualCardReady
        ? 'Issue and manage virtual cards instantly'
        : 'Virtual cards are coming soon',
    },
    {
      icon: Eye,
      title: 'Full Control',
      description: 'Freeze, unfreeze or delete anytime',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-32 rounded-b-[24px]">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-white">
              <ChevronLeft size={24} />
            </Link>
            <h1 className="text-xl font-bold text-white">My Cards</h1>
          </div>
          <button className="text-white">
            <MoreVertical size={24} />
          </button>
        </div>
      </div>

      <div className="px-6 -mt-24">
        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 p-4 rounded-2xl text-sm mb-6">
          Virtual cards require verified Level 3 KYC. Keep your card limits updated for safety.
        </div>
        {cards.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-2xl mb-6 text-center">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard size={28} className="text-[#235697]" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              No virtual cards yet
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Create a virtual card to start online payments and subscriptions.
            </p>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {cards.map((card) => (
              <div
                key={card.id}
                className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Virtual Card</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {card.masked_pan || '**** **** **** ****'}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-3 py-1 rounded-full ${
                      card.status === 'frozen'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {card.status === 'frozen' ? 'Frozen' : 'Active'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>Expiry: {card.expiry || '—'}</span>
                  <span>Balance: ₦{Number(card.balance || 0).toLocaleString('en-NG')}</span>
                </div>
                <button
                  onClick={() => toggleFreeze(card)}
                  className="mt-4 w-full bg-[#235697] text-white py-2 rounded-xl text-sm font-semibold"
                >
                  {card.status === 'frozen' ? 'Unfreeze Card' : 'Freeze Card'}
                </button>
                <button
                  onClick={() => openSettings(card)}
                  className="mt-2 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-2 rounded-xl text-sm font-semibold"
                >
                  Card Settings
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Card Actions */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow flex flex-col items-center gap-2 opacity-60 cursor-not-allowed">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <Lock size={24} className="text-blue-600" />
            </div>
            <span className="text-xs font-medium text-gray-900 dark:text-white">Freeze</span>
          </button>

          <button className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow flex flex-col items-center gap-2 opacity-60 cursor-not-allowed">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <Plus size={24} className="text-green-600" />
            </div>
            <span className="text-xs font-medium text-gray-900 dark:text-white">Top Up</span>
          </button>

          <button className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow flex flex-col items-center gap-2 opacity-60 cursor-not-allowed">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
              <CreditCard size={24} className="text-purple-600" />
            </div>
            <span className="text-xs font-medium text-gray-900 dark:text-white">Details</span>
          </button>
        </div>

        {/* Features */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Card Features</h2>
          <div className="space-y-3">
            {cardFeatures.map((feature) => (
              <div
                key={feature.title}
                className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-[#235697] to-[#114280] rounded-xl flex items-center justify-center">
                  <feature.icon size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Virtual Card Provider */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow mb-6">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            Virtual Card Provider
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {virtualCardProvider
              ? `Planned partner: ${virtualCardProvider}`
              : 'No provider configured yet.'}
          </p>
          <span className="inline-flex mt-3 items-center text-xs px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
            {virtualCardReady ? 'Live' : 'Coming Soon'}
          </span>
        </div>

        {/* Create New Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow mb-6">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Fund & Create Card
          </p>
          {error && (
            <p className="text-xs text-red-500 mb-2">{error}</p>
          )}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                placeholder="Enter amount"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!virtualCardReady || loading || !amount}
              className="bg-gradient-to-r from-[#235697] to-[#114280] text-white px-4 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
          {!virtualCardReady && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Virtual cards are coming soon. We’ll enable this after Flutterwave setup.
            </p>
          )}
        </div>

        {/* Coming Soon Section */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-3xl p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#235697] to-[#114280] rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard size={40} className="text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Physical Cards</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Order a physical debit card delivered to your doorstep
          </p>
          <div className="inline-block bg-gradient-to-r from-[#235697] to-[#114280] text-white px-6 py-2 rounded-full text-sm font-semibold">
            Coming Soon
          </div>
        </div>
      </div>

      <BottomNav />

      {settingsOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50">
          <div className="w-full bg-white dark:bg-gray-900 rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Card Settings</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {selectedCard?.masked_pan || 'Virtual Card'}
                </p>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="text-sm text-gray-500 dark:text-gray-400"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Daily spend limit</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
                  <input
                    type="number"
                    value={settings.dailyLimit}
                    onChange={(e) => setSettings({ ...settings, dailyLimit: e.target.value })}
                    className="w-full pl-8 pr-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    placeholder="e.g. 20000"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Monthly spend limit</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
                  <input
                    type="number"
                    value={settings.monthlyLimit}
                    onChange={(e) => setSettings({ ...settings, monthlyLimit: e.target.value })}
                    className="w-full pl-8 pr-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    placeholder="e.g. 200000"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Merchant locks</label>
                <input
                  value={settings.merchantLocks}
                  onChange={(e) => setSettings({ ...settings, merchantLocks: e.target.value })}
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                  placeholder="e.g. Netflix, Spotify, AWS"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Comma‑separated list of merchants to allow.
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={settings.autoFreeze}
                  onChange={(e) => setSettings({ ...settings, autoFreeze: e.target.checked })}
                />
                Auto‑freeze on suspicious activity
              </label>

              <button
                onClick={saveSettings}
                className="w-full bg-gradient-to-r from-[#235697] to-[#114280] text-white py-3 rounded-xl text-sm font-semibold"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
