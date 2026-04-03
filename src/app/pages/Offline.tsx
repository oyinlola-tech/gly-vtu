import { WifiOff } from 'lucide-react';

export default function Offline() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-slate-900 flex items-center justify-center p-6 text-white">
      <div className="max-w-md text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
          <WifiOff size={28} />
        </div>
        <h1 className="text-3xl font-bold">You’re offline</h1>
        <p className="text-white/70">
          It looks like your internet connection is down. Check your network and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-white text-slate-900 px-6 py-2 rounded-full font-semibold"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
