import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';

interface PINInputProps {
  length?: number;
  onComplete: (pin: string) => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
  error?: string;
}

export default function PINInput({
  length = 4,
  onComplete,
  onCancel,
  title = 'Enter PIN',
  subtitle = 'Enter your transaction PIN',
  error,
}: PINInputProps) {
  const [pin, setPin] = useState<string[]>(Array(length).fill(''));
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (pin.every(digit => digit !== '')) {
      onComplete(pin.join(''));
    }
  }, [pin, onComplete]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      setActiveIndex(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (pin[index]) {
        const newPin = [...pin];
        newPin[index] = '';
        setPin(newPin);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        setActiveIndex(index - 1);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#235697]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#235697]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>

        <div className="flex justify-center gap-3 mb-6">
          {pin.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="tel"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onFocus={() => setActiveIndex(index)}
              className={`w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all ${
                digit
                  ? 'border-[#235697] bg-[#235697]/5'
                  : activeIndex === index
                  ? 'border-[#235697]'
                  : 'border-gray-200 dark:border-gray-700'
              } focus:outline-none focus:border-[#235697] dark:bg-gray-800 dark:text-white`}
            />
          ))}
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-500 text-sm text-center mb-4"
          >
            {error}
          </motion.p>
        )}

        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full py-3 text-gray-600 dark:text-gray-400 font-medium"
          >
            Cancel
          </button>
        )}
      </motion.div>
    </div>
  );
}
