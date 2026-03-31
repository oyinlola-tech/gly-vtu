import { Wrench, Clock } from 'lucide-react';

export default function Maintenance() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6 text-white">
      <div className="max-w-xl text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
          <Wrench size={28} />
        </div>
        <h1 className="text-3xl font-bold">We’re performing maintenance</h1>
        <p className="text-white/70">
          GLY-VTU is undergoing scheduled updates. We’ll be back shortly. Thank you for your patience.
        </p>
        <div className="inline-flex items-center gap-2 text-sm bg-white/10 px-4 py-2 rounded-full">
          <Clock size={16} />
          Estimated return: soon
        </div>
      </div>
    </div>
  );
}
