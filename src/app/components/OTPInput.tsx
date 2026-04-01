import { useMemo } from 'react';

interface OTPInputProps {
  value: string;
  length?: number;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

export default function OTPInput({
  value,
  length = 6,
  onChange,
  autoFocus = false,
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

  return (
    <div
      className="flex items-center justify-center gap-2"
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
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
              const prev = (e.currentTarget.closest('div') as HTMLDivElement | null)?.querySelector<HTMLInputElement>(
                `input[data-otp="${idx - 1}"]`
              );
              prev?.focus();
            }
          }}
          className="w-12 h-12 text-center text-lg font-semibold rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#235697] focus:outline-none"
        />
      ))}
    </div>
  );
}
