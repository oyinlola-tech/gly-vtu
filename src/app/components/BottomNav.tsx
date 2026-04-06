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
    <div className="fixed bottom-0 left-0 right-0 px-4 pb-safe z-40">
      <div className="fintech-nav rounded-t-3xl shadow-[0_-18px_40px_rgba(15,23,42,0.12)]">
        <div className="flex items-center justify-around h-20 max-w-screen-md mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center justify-center gap-1 flex-1 py-2"
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-2xl transition-all ${
                    isActive ? 'bg-[#235697]/10 text-[#235697]' : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  <item.icon size={22} />
                </div>
                <span
                  className={`text-[11px] ${
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
    </div>
  );
}
