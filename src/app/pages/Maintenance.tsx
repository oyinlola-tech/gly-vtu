import { Wrench, Clock, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Maintenance() {
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hour in seconds

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6 text-white relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative max-w-2xl text-center space-y-8">
        <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl">
          <Wrench size={32} className="text-white" />
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Scheduled Maintenance
          </h1>
          <p className="text-lg text-gray-300 max-w-lg mx-auto leading-relaxed">
            We're performing essential updates to improve your GLY-VTU experience. Our services will be back online shortly.
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 max-w-md mx-auto">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Clock size={20} className="text-blue-400" />
            <span className="text-sm font-medium text-gray-300">Estimated Return</span>
          </div>
          <div className="font-mono text-3xl font-bold text-white mb-2">
            {formatTime(timeLeft)}
          </div>
          <p className="text-xs text-gray-400">
            This is an estimate and may change
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-full font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <RefreshCw size={18} />
            Check Status
          </button>
          <a
            href="mailto:support@gly-vtu.com"
            className="text-gray-400 hover:text-white transition-colors duration-200 underline"
          >
            Contact Support
          </a>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>Thank you for your patience and understanding.</p>
          <p>We apologize for any inconvenience caused.</p>
        </div>
      </div>
    </div>
  );
}
