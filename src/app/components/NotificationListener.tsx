import { useEffect, useRef } from 'react';
import { toast, Toaster } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

export default function NotificationListener() {
  const wsRef = useRef<WebSocket | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    wsRef.current?.close();
    if (!user?.id) return;
    const wsUrl = import.meta.env.VITE_WS_URL || `${window.location.origin.replace('http', 'ws')}/ws`;
    const ws = new WebSocket(`${wsUrl}?role=user`);
    wsRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.type === 'notification.new') {
          const note = payload.notification || {};
          toast(note.title || 'Notification', {
            description: note.body || '',
            duration: note.force ? Infinity : 4000,
          });
        }
      } catch {
        // ignore
      }
    };

    return () => ws.close();
  }, [user?.id]);

  return <Toaster position="top-right" richColors />;
}
