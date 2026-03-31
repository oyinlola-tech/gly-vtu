import { useMemo } from 'react';

const COUNTRIES = [
  { code: 'NG', label: 'Nigeria', dial: '+234' },
  { code: 'GH', label: 'Ghana', dial: '+233' },
  { code: 'KE', label: 'Kenya', dial: '+254' },
  { code: 'ZA', label: 'South Africa', dial: '+27' },
  { code: 'US', label: 'United States', dial: '+1' },
  { code: 'GB', label: 'United Kingdom', dial: '+44' },
];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  countryCode?: string;
  onCountryChange?: (code: string) => void;
  placeholder?: string;
}

export default function PhoneInput({
  value,
  onChange,
  countryCode = 'NG',
  onCountryChange,
  placeholder = 'Phone number',
}: PhoneInputProps) {
  const selected = useMemo(
    () => COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0],
    [countryCode]
  );

  const localValue = value.replace(selected.dial, '').replace(/\D/g, '');

  return (
    <div className="flex items-center gap-2">
      <select
        value={selected.code}
        onChange={(e) => onCountryChange?.(e.target.value)}
        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label} ({c.dial})
          </option>
        ))}
      </select>
      <input
        type="tel"
        value={localValue}
        onChange={(e) => onChange(`${selected.dial}${e.target.value.replace(/\D/g, '')}`)}
        placeholder={placeholder}
        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#235697] focus:outline-none"
      />
    </div>
  );
}
