import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { userAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import BottomNav from '../components/BottomNav';
import PhoneInput from '../components/PhoneInput';
import Breadcrumbs from '../components/Breadcrumbs';

export default function Profile() {
  const { refreshProfile } = useAuth();
  const [formData, setFormData] = useState({ fullName: '', phone: '', email: '' });
  const [phoneCountry, setPhoneCountry] = useState('NG');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const inferCountry = (value: string) => {
    if (value.startsWith('+233')) return 'GH';
    if (value.startsWith('+254')) return 'KE';
    if (value.startsWith('+27')) return 'ZA';
    if (value.startsWith('+1')) return 'US';
    if (value.startsWith('+44')) return 'GB';
    return 'NG';
  };

  useEffect(() => {
    userAPI
      .getProfile()
      .then((profile) => {
        setFormData({
          fullName: profile.full_name,
          phone: profile.phone,
          email: profile.email,
        });
        if (profile.phone) {
          setPhoneCountry(inferCountry(profile.phone));
        }
      })
      .catch(() => null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await userAPI.updateProfile({ fullName: formData.fullName, phone: formData.phone });
      await refreshProfile();
      setMessage('Profile updated');
    } catch {
      setMessage('Unable to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-24 rounded-b-[24px]">
        <div className="flex items-center gap-4">
          <Link to="/more" className="text-white" aria-label="Back to settings">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-white">Profile Settings</h1>
        </div>
        <div className="mt-3 text-white/80 text-xs">
          <Breadcrumbs items={[{ label: 'Settings', href: '/more' }, { label: 'Profile' }]} />
        </div>
      </div>

      <div className="px-6 -mt-16">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6">
          {message && (
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-xl text-sm mb-4">
              {message}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                required
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <PhoneInput
                value={formData.phone}
                onChange={(value) => setFormData({ ...formData, phone: value })}
                countryCode={phoneCountry}
                onCountryChange={setPhoneCountry}
                placeholder="8000000000"
                inputId="phone"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#235697] to-[#114280] text-white py-4 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
