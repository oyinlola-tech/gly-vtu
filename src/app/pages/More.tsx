import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { 
  ChevronRight, User, Lock, Bell, Moon, Sun, HelpCircle, 
  MessageCircle, FileText, Shield, LogOut, ChevronLeft 
} from 'lucide-react';
import BottomNav from '../components/BottomNav';
import SupportChat from '../components/SupportChat';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

export default function More() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [showChat, setShowChat] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sections = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Profile Settings', path: '/profile', badge: null },
        { icon: Lock, label: 'Security & PIN', path: '/security', badge: null },
        { icon: Bell, label: 'Notifications', path: '/notifications', badge: '3' },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { 
          icon: theme === 'dark' ? Sun : Moon, 
          label: 'Dark Mode', 
          action: toggleTheme, 
          toggle: true,
          value: theme === 'dark'
        },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: MessageCircle, label: 'Live Chat Support', action: () => setShowChat(true) },
        { icon: HelpCircle, label: 'Help Center', path: '/help' },
        { icon: FileText, label: 'Terms & Privacy', path: '/terms' },
      ],
    },
    {
      title: 'About',
      items: [
        { icon: Shield, label: 'Security Tips', path: '/security-tips' },
        { icon: FileText, label: 'App Version', path: '#', badge: 'v1.0.0' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-12">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard" className="text-white">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-white">Settings</h1>
        </div>

        {/* User Profile Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <User size={32} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-lg">{user?.name || 'User'}</p>
            <p className="text-white/80 text-sm">{user?.email || 'user@glyvtu.ng'}</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
              {section.title}
            </h3>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow overflow-hidden">
              {section.items.map((item, index) => (
                <div key={item.label}>
                  {item.action && !item.path ? (
                    <button
                      onClick={item.action}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={20} className="text-gray-600 dark:text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-white">{item.label}</span>
                      </div>
                      {item.toggle !== undefined && (
                        <div className={`w-12 h-6 rounded-full transition-colors ${
                          item.value ? 'bg-[#235697]' : 'bg-gray-300 dark:bg-gray-600'
                        } relative`}>
                          <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                            item.value ? 'translate-x-6' : 'translate-x-0.5'
                          }`} />
                        </div>
                      )}
                    </button>
                  ) : (
                    <Link
                      to={item.path || '#'}
                      className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={20} className="text-gray-600 dark:text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-white">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.badge && (
                          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight size={20} className="text-gray-400" />
                      </div>
                    </Link>
                  )}
                  {index < section.items.length - 1 && (
                    <div className="h-px bg-gray-100 dark:bg-gray-800 mx-4" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full bg-white dark:bg-gray-900 rounded-2xl shadow p-4 flex items-center justify-center gap-3 text-red-600 font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>

      {showChat && <SupportChat onClose={() => setShowChat(false)} />}
      <BottomNav />
    </div>
  );
}
