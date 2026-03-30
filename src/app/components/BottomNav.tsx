import { Link, useLocation } from 'react-router';
import { Home, Send, Receipt, CreditCard, Menu } from 'lucide-react';

export default function BottomNav() {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: Send, label: 'Send', path: '/send' },
    { icon: Receipt, label: 'Bills', path: '/bills' },
    { icon: CreditCard, label: 'Cards', path: '/cards' },
    { icon: Menu, label: 'More', path: '/more' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-4 pb-safe z-40">
      <div className="flex items-center justify-around h-20 max-w-screen-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center gap-1 flex-1"
            >
              <item.icon
                size={24}
                className={isActive ? 'text-[#235697]' : 'text-gray-400 dark:text-gray-500'}
              />
              <span
                className={`text-xs ${
                  isActive ? 'text-[#235697] font-semibold' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
