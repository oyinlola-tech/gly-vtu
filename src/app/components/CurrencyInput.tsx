import { useMemo } from 'react';

interface CurrencyInputProps {
  value: number | string;
  onChange: (value: number) => void;
  currency?: string;
  locale?: string;
  placeholder?: string;
  inputId?: string;
  ariaLabel?: string;
}

export default function CurrencyInput({
  value,
  onChange,
  currency = 'NGN',
  locale = 'en-NG',
  placeholder = '0.00',
  inputId,
  ariaLabel,
}: CurrencyInputProps) {
  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [currency, locale]
  );

  const numericValue = typeof value === 'string' ? Number(value.replace(/[^\d.]/g, '')) : Number(value || 0);

  return (
    <div className="flex items-center gap-3 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-300">{currency}</span>
      <input
        id={inputId}
        type="text"
        value={numericValue ? formatter.format(numericValue) : ''}
        onChange={(e) => onChange(Number(e.target.value.replace(/[^\d.]/g, '')))}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="flex-1 focus:outline-none text-sm bg-transparent text-gray-900 dark:text-white"
      />
    </div>
  );
}
