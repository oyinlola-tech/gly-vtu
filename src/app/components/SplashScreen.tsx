import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#235697] to-[#114280] flex flex-col items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6"
        >
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center">
            <span className="text-4xl font-bold text-[#235697]">GLY</span>
          </div>
        </motion.div>
        <h1 className="text-4xl font-bold text-white mb-2">GLY VTU</h1>
        <p className="text-white/80 text-sm">Your trusted payment partner</p>
      </motion.div>

      <div className="w-64">
        <div className="h-1 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-white rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-white/60 text-xs text-center mt-2">Loading... {progress}%</p>
      </div>
    </div>
  );
}
