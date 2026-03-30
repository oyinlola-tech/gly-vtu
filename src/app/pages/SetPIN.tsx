import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { userAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function SetPIN() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const PIN_LENGTH = 6;
  const [step, setStep] = useState<'set' | 'confirm'>('set');
  const [pin, setPin] = useState(Array(PIN_LENGTH).fill(''));
  const [confirmPin, setConfirmPin] = useState(Array(PIN_LENGTH).fill(''));
  const [error, setError] = useState('');
  const inputRefs: (HTMLInputElement | null)[] = [];

  const currentPin = step === 'set' ? pin : confirmPin;
  const setCurrentPin = step === 'set' ? setPin : setConfirmPin;

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newPin = [...currentPin];
    newPin[index] = value;
    setCurrentPin(newPin);

    if (value && index < PIN_LENGTH - 1) {
      inputRefs[index + 1]?.focus();
    }

    if (newPin.every((digit) => digit !== '')) {
      handleComplete(newPin.join(''));
    }
  };

  const handleComplete = async (completedPin: string) => {
    if (step === 'set') {
      setStep('confirm');
      setTimeout(() => inputRefs[0]?.focus(), 100);
    } else {
      if (completedPin !== pin.join('')) {
        setError('PINs do not match');
        setConfirmPin(Array(PIN_LENGTH).fill(''));
        setTimeout(() => inputRefs[0]?.focus(), 100);
        return;
      }

      try {
        await userAPI.setPin(completedPin);
        if (user) {
          setUser({ ...user, hasPin: true });
        }
        navigate('/dashboard');
      } catch (err) {
        setError('Failed to set PIN');
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (currentPin[index]) {
        const newPin = [...currentPin];
        newPin[index] = '';
        setCurrentPin(newPin);
      } else if (index > 0) {
        inputRefs[index - 1]?.focus();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#235697] to-[#114280] flex items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {step === 'set' ? 'Set Transaction PIN' : 'Confirm PIN'}
          </h1>
          <p className="text-white/80">
            {step === 'set'
              ? 'Create a 6-digit PIN to secure your transactions'
              : 'Re-enter your PIN to confirm'}
          </p>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          {currentPin.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                if (el) inputRefs[index] = el;
              }}
              type="tel"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-16 h-16 text-center text-2xl font-bold rounded-2xl bg-white/20 border-2 border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-white focus:bg-white/30 transition-all"
            />
          ))}
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/20 border border-red-300 text-white p-4 rounded-xl text-center mb-6"
          >
            {error}
          </motion.div>
        )}

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
          <p className="text-white/80 text-sm text-center">
            💡 This PIN will be used to authorize all your transactions. Keep it secure and don't share it with anyone.
          </p>
        </div>

        {step === 'confirm' && (
          <button
            onClick={() => {
              setStep('set');
              setPin(Array(PIN_LENGTH).fill(''));
              setConfirmPin(Array(PIN_LENGTH).fill(''));
              setError('');
            }}
            className="mt-6 w-full py-4 text-white font-medium hover:bg-white/10 rounded-xl transition-colors"
          >
            Start Over
          </button>
        )}
      </motion.div>
    </div>
  );
}
