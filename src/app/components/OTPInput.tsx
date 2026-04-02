import { useMemo } from 'react';
import type { ClipboardEvent } from 'react';

interface OTPInputProps {
  value: string;
  length?: number;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  containerClassName?: string;
  inputClassName?: string;
}

export default function OTPInput({
  value,
  length = 6,
  onChange,
  autoFocus = false,
  containerClassName,
  inputClassName,
}: OTPInputProps) {
  const digits = useMemo(() => {
    const normalized = value.replace(/\D/g, '').slice(0, length);
    return Array.from({ length }, (_, idx) => normalized[idx] || '');
  }, [value, length]);

  const handleChange = (index: number, next: string, root: HTMLDivElement | null) => {
    const sanitized = next.replace(/\D/g, '').slice(-1);
    const updated = [...digits];
    updated[index] = sanitized;
    const joined = updated.join('');
    onChange(joined);
    if (sanitized && root) {
      const nextInput = root.querySelector<HTMLInputElement>(`input[data-otp="${index + 1}"]`);
      nextInput?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>, root: HTMLDivElement | null) => {
    const raw = event.clipboardData.getData('text');
    const cleaned = raw.replace(/\D/g, '').slice(0, length);
    if (!cleaned) return;
    event.preventDefault();
    onChange(cleaned);
    if (root) {
      const lastIndex = Math.min(cleaned.length, length) - 1;
      const target = root.querySelector<HTMLInputElement>(`input[data-otp="${lastIndex}"]`);
      target?.focus();
    }
  };

  return (
    <div
      className={`flex items-center justify-center gap-2 ${containerClassName || ''}`}
      ref={(node) => {
        if (autoFocus && node) {
          const first = node.querySelector<HTMLInputElement>('input[data-otp="0"]');
          first?.focus();
        }
      }}
    >
      {digits.map((digit, idx) => (
        <input
          key={idx}
          data-otp={idx}
          aria-label={`OTP digit ${idx + 1}`}
          inputMode="numeric"
          autoComplete={idx === 0 ? 'one-time-code' : 'off'}
          value={digit}
          onChange={(e) => handleChange(idx, e.target.value, e.currentTarget.closest('div'))}
          onPaste={(e) => handlePaste(e, e.currentTarget.closest('div'))}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
              const prev = (e.currentTarget.closest('div') as HTMLDivElement | null)?.querySelector<HTMLInputElement>(
                `input[data-otp="${idx - 1}"]`
              );
              prev?.focus();
            }
          }}
          className={`w-12 h-12 text-center text-lg font-semibold rounded-xl border border-gray-200 bg-white/90 dark:bg-gray-900 focus:ring-2 focus:ring-[#235697] focus:outline-none shadow-[0_8px_18px_rgba(15,23,42,0.08)] ${inputClassName || ''}`}
        />
      ))}
    </div>
  );
}
