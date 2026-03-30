import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, Copy } from 'lucide-react';
import { userAPI } from '../../services/api';
import BottomNav from '../components/BottomNav';

export default function AddMoney() {
  const [account, setAccount] = useState<any>(null);

  useEffect(() => {
    userAPI
      .getProfile()
      .then((profile) =>
        setAccount({
          accountNumber: profile.account_number,
          bankName: profile.bank_name,
          accountName: profile.account_name || profile.full_name,
        })
      )
      .catch(() => null);
  }, []);

  const handleCopy = (value: string) => {
    navigator.clipboard?.writeText(value).catch(() => null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-24 rounded-b-[24px]">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-white">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-white">Add Money</h1>
        </div>
      </div>

      <div className="px-6 -mt-16">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6">
          {account?.accountNumber ? (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Transfer to your reserved account to fund your wallet instantly.
              </p>
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Account Name</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{account.accountName}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Account Number</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{account.accountNumber}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(account.accountNumber)}
                    className="text-[#235697] hover:text-[#1e4a7f]"
                  >
                    <Copy size={18} />
                  </button>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Bank</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{account.bankName}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Complete KYC to get your reserved account.
              </p>
              <Link
                to="/kyc"
                className="mt-4 inline-block bg-[#235697] text-white px-6 py-3 rounded-xl font-semibold"
              >
                Complete KYC
              </Link>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
