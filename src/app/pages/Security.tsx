import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { userAPI } from '../../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import BottomNav from '../components/BottomNav';

export default function Security() {
  const [security, setSecurity] = useState<any>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSecurity();
  }, []);

  const loadSecurity = async () => {
    try {
      const [status, qs, current] = await Promise.all([
        userAPI.getSecurityStatus(),
        userAPI.getSecurityQuestions(),
        userAPI.getSecurityQuestion(),
      ]);
      setSecurity(status);
      setQuestions(qs || []);
      setQuestion(current?.question || '');
    } catch {
      // ignore
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      if (security?.pinSet) {
        await userAPI.changePin(pinForm.currentPin, pinForm.newPin);
      } else {
        await userAPI.setPin(pinForm.newPin);
      }
      setMessage('PIN updated');
      setPinForm({ currentPin: '', newPin: '' });
      await loadSecurity();
    } catch (err) {
      setMessage('Unable to update PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await userAPI.setSecurityQuestion(question, answer);
      await userAPI.enableSecurityQuestion(true);
      setAnswer('');
      setMessage('Security question updated');
      await loadSecurity();
    } catch {
      setMessage('Unable to update security question');
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
          <h1 className="text-xl font-bold text-white">Security & PIN</h1>
        </div>
      </div>

      <div className="px-6 -mt-16 space-y-6">
        {message && (
          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-xl text-sm">
            {message}
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {security?.pinSet ? 'Change Transaction PIN' : 'Set Transaction PIN'}
          </h2>
          <form onSubmit={handlePinSubmit} className="space-y-4">
            {security?.pinSet && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current PIN
                </label>
                <input
                  type="password"
                  value={pinForm.currentPin}
                  onChange={(e) => setPinForm({ ...pinForm, currentPin: e.target.value })}
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New PIN
              </label>
              <input
                type="password"
                value={pinForm.newPin}
                onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value })}
                maxLength={6}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#235697] to-[#114280] text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Update PIN'}
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Security Question</h2>
          <form onSubmit={handleQuestionSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Question
              </label>
              <select
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                required
              >
                <option value="" disabled>
                  Select a security question
                </option>
                {questions.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Answer
              </label>
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 py-3 rounded-xl font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Save Security Question'}
            </button>
          </form>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
