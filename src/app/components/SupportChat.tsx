import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, User, Bot } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { conversationsAPI, tokenStore } from '../../services/api';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'admin';
  timestamp: Date;
}

interface SupportChatProps {
  onClose: () => void;
}

export default function SupportChat({ onClose }: SupportChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    let mounted = true;
    conversationsAPI
      .getMine()
      .then((data) => {
        if (!mounted) return;
        const incoming = (data?.messages || []).map((msg: any) => ({
          id: msg.id,
          text: msg.body,
          sender: msg.sender_type === 'admin' ? 'admin' : 'user',
          timestamp: new Date(msg.created_at),
        }));
        setMessages(incoming);
      })
      .catch(() => null);

    const token = tokenStore.getAccessToken();
    const wsUrl = import.meta.env.VITE_WS_URL || `${window.location.origin.replace('http', 'ws')}/ws`;
    if (token) {
      const ws = new WebSocket(`${wsUrl}?role=user`, [token]);
      wsRef.current = ws;
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type === 'chat.message') {
            const msg = payload.message;
            setMessages((prev) => {
              const sender = msg.senderType === 'admin' ? 'admin' : 'user';
              const timestamp = new Date(msg.createdAt || Date.now());
              if (sender === 'user') {
                const last = prev[prev.length - 1];
                if (last && last.sender === 'user' && last.text === msg.body) {
                  return prev;
                }
              }
              return [
                ...prev,
                {
                  id: msg.id,
                  text: msg.body,
                  sender,
                  timestamp,
                },
              ];
            });
          }
        } catch {
          // ignore
        }
      };
    }

    return () => {
      mounted = false;
      wsRef.current?.close();
    };
  }, []);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const optimistic: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInputText('');

    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'chat.send', text: inputText }));
    } else {
      conversationsAPI.send(inputText).catch(() => null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md flex flex-col h-[600px]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#235697] to-[#114280] p-4 rounded-t-3xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Bot size={24} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold">Support Team</p>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <p className="text-white/80 text-xs">Online</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.length === 0 && (
              <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
                Start a conversation with our support team.
              </div>
            )}
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.sender === 'user' 
                    ? 'bg-[#235697]' 
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}>
                  {message.sender === 'user' ? (
                    <User size={18} className="text-white" />
                  ) : (
                    <Bot size={18} className="text-gray-600 dark:text-gray-300" />
                  )}
                </div>
                <div className={`max-w-[70%] ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-2xl px-4 py-2 ${
                    message.sender === 'user'
                      ? 'bg-[#235697] text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  }`}>
                    <p className="text-sm">{message.text}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 px-1">
                    {message.timestamp.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="w-12 h-12 bg-[#235697] text-white rounded-full flex items-center justify-center hover:bg-[#1e4a7f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
