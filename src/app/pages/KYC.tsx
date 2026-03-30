import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { userAPI } from '../../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import BottomNav from '../components/BottomNav';

export default function KYC() {
  const [profile, setProfile] = useState<any>(null);
  const [level, setLevel] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
    bvn: '',
    nin: '',
    dob: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    userAPI
      .getProfile()
      .then((data) => setProfile(data))
      .catch(() => null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const payload =
        level === 1
          ? { bvn: formData.bvn || undefined, nin: formData.nin || undefined }
          : { dob: formData.dob, address: formData.address };
      await userAPI.submitKYC({ level, payload });
      setMessage('KYC submitted successfully');
    } catch (err) {
      setMessage('KYC submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-24 rounded-b-[24px]">
        <div className="flex items-center gap-4">
          <Link to="/more" className="text-white">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-white">KYC Verification</h1>
        </div>
      </div>

      <div className="px-6 -mt-16 space-y-6">
        {profile && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow">
            <p className="text-sm text-gray-500 dark:text-gray-400">Current Level</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              Level {profile.kyc_level} • {profile.kyc_status}
            </p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6">
          {message && (
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-xl text-sm mb-4">
              {message}
            </div>
          )}

          <div className="flex gap-3 mb-6">
            {[1, 2].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevel(lvl as 1 | 2)}
                className={`flex-1 py-3 rounded-xl font-semibold ${
                  level === lvl
                    ? 'bg-[#235697] text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                Level {lvl}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {level === 1 ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    BVN (optional if NIN provided)
                  </label>
                  <input
                    type="text"
                    value={formData.bvn}
                    onChange={(e) => setFormData({ ...formData, bvn: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    NIN (optional if BVN provided)
                  </label>
                  <input
                    type="text"
                    value={formData.nin}
                    onChange={(e) => setFormData({ ...formData, nin: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                    required
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#235697] to-[#114280] text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Submit KYC'}
            </button>
          </form>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
