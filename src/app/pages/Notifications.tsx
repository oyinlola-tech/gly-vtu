import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, Bell } from 'lucide-react';
import { notificationsAPI } from '../../services/api';
import BottomNav from '../components/BottomNav';

export default function Notifications() {
  type NotificationItem = {
    id: string;
    title: string;
    body: string;
    created_at: string;
    read_at?: string | null;
    force?: boolean;
  };

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const loadNotifications = useCallback(async () => {
    try {
      const data = (await notificationsAPI.list()) as NotificationItem[] | undefined;
      setNotifications(data || []);
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadNotifications();
  }, [loadNotifications]);

  const markAll = async () => {
    await notificationsAPI.markAll();
    await loadNotifications();
  };

  const markRead = async (id: string) => {
    await notificationsAPI.markRead([id]);
    await loadNotifications();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      <div className="bg-gradient-to-br from-[#235697] to-[#114280] p-6 pb-24 rounded-b-[24px]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link to="/more" className="text-white">
              <ChevronLeft size={24} />
            </Link>
            <h1 className="text-xl font-bold text-white">Notifications</h1>
          </div>
          <button onClick={markAll} className="text-white/80 text-sm">
            Mark all read
          </button>
        </div>
      </div>

      <div className="px-6 -mt-16 space-y-3">
        {notifications.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center shadow">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <Bell size={20} className="text-gray-500" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet.</p>
          </div>
        ) : (
          notifications.map((note) => (
            <button
              key={note.id}
              onClick={() => markRead(note.id)}
              className={`w-full text-left bg-white dark:bg-gray-900 rounded-2xl p-4 shadow ${
                note.read_at ? 'opacity-70' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-gray-900 dark:text-white">{note.title}</p>
                {note.force ? (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                    Force
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{note.body}</p>
              <p className="text-xs text-gray-400 mt-2">
                {new Date(note.created_at).toLocaleString()}
              </p>
            </button>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
