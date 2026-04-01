import React, { useMemo } from 'react';
// @ts-expect-error - zxcvbn does not have TypeScript types available
import zxcvbn from 'zxcvbn';

/**
 * PasswordStrengthIndicator Component
 * Shows visual feedback on password strength as user types
 * 
 * Usage:
 * <PasswordStrengthIndicator password={password} />
 */
interface PasswordStrengthIndicatorProps {
  password?: string;
}

interface ZxcvbnResult {
  score: number;
  feedback: { warning: string; suggestions: string[] };
}

export function PasswordStrengthIndicator({ password = '' }: PasswordStrengthIndicatorProps) {
  const { strength, feedback } = useMemo(() => {
    if (!password) {
      return { strength: 0, feedback: '' };
    }

    // @ts-expect-error - zxcvbn does not have TypeScript types available
    const result = zxcvbn(password) as ZxcvbnResult;

    // Generate feedback message
    const messages = [
      'Very weak. Use a longer password with mixed characters.',
      'Weak. Add uppercase letters, numbers, or symbols.',
      'Fair. Consider making it longer or more complex.',
      'Good. This password is reasonably secure.',
      'Strong. Excellent password strength!',
    ];

    return { strength: result.score, feedback: messages[result.score] };
  }, [password]);

  const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];
  const colorLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      <div className="flex h-2 gap-1 bg-opacity-25 rounded-full overflow-hidden">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="flex-1 h-full transition-all duration-300"
            style={{
              backgroundColor: i < (strength + 1) ? colors[strength] : '#e5e7eb'
            }}
          />
        ))}
      </div>

      {/* Strength Label and Feedback */}
      {password && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: colors[strength] }}>
            {colorLabels[strength]}
          </span>
          <span className="text-xs text-gray-600">{feedback}</span>
        </div>
      )}

      {/* Requirements Checklist */}
      {password && (
        <div className="text-xs space-y-1 mt-3 p-3 bg-gray-50 rounded">
          <RequirementCheck met={password.length >= 8} label="At least 8 characters" />
          <RequirementCheck met={/[A-Z]/.test(password)} label="Uppercase letter (A-Z)" />
          <RequirementCheck met={/[a-z]/.test(password)} label="Lowercase letter (a-z)" />
          <RequirementCheck met={/[0-9]/.test(password)} label="Number (0-9)" />
          <RequirementCheck met={/[^A-Za-z0-9]/.test(password)} label="Special character (!@#$%^&*)" />
        </div>
      )}
    </div>
  );
}

/**
 * RequirementCheck Component
 * Helper component to show individual password requirement status
 */
interface RequirementCheckProps {
  met: boolean;
  label: string;
}

function RequirementCheck({ met, label }: RequirementCheckProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
        met ? 'bg-green-500 border-green-500' : 'border-gray-300'
      }`}>
        {met && <span className="text-white text-xs">✓</span>}
      </div>
      <span className={met ? 'text-gray-700' : 'text-gray-500'}>{label}</span>
    </div>
  );
}

export default PasswordStrengthIndicator;
