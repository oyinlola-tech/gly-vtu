import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { Check, ShieldCheck } from 'lucide-react';
import PhoneInput from '../components/PhoneInput';
import PasswordStrengthIndicator from '../../components/PasswordStrengthIndicator';
import OTPInput from '../components/OTPInput';

const SAMPLE_PROFILES = {
  nin: {
    fullName: 'Amina Okafor',
    dob: '1995-04-12',
    gender: 'Female',
    phone: '+2348020001000',
    address: '12 Admiralty Way, Lekki',
  },
  bvn: {
    fullName: 'Tunde Adebayo',
    dob: '1990-09-03',
    gender: 'Male',
    phone: '+2348135552190',
    address: '18 Awolowo Road, Ikoyi',
  },
};

type IdentityType = 'nin' | 'bvn';

const buildNames = (fullName: string) => {
  const parts = fullName.trim().split(' ').filter(Boolean);
  const firstName = parts.shift() || '';
  const lastName = parts.join(' ');
  return { firstName, lastName };
};

export default function Register() {
  const navigate = useNavigate();
  const { register, sendRegistrationOtp, verifyRegistrationOtp } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [phoneCountry, setPhoneCountry] = useState('NG');
  const [otpCode, setOtpCode] = useState('');
  const [identityType, setIdentityType] = useState<IdentityType>('nin');
  const [identityValue, setIdentityValue] = useState('');
  const [identityVerified, setIdentityVerified] = useState(false);
  const [profile, setProfile] = useState<(typeof SAMPLE_PROFILES)['nin'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const progress = useMemo(() => {
    if (step === 1) return 25;
    if (step === 2) return 50;
    if (step === 3) return 75;
    return 100;
  }, [step]);

  const maskedEmail = useMemo(() => {
    const [name, domain] = formData.email.split('@');
    if (!name || !domain) return formData.email;
    const safeName =
      name.length <= 2
        ? name[0] + '*'
        : `${name[0]}${'*'.repeat(Math.max(2, name.length - 2))}${name[name.length - 1]}`;
    return `${safeName}@${domain}`;
  }, [formData.email]);

  const maskedId = useMemo(() => {
    const digits = identityValue.replace(/\D/g, '');
    if (digits.length < 4) return digits;
    const last = digits.slice(-4);
    return `•••••••${last}`;
  }, [identityValue]);

  const handleResendOtp = async () => {
    setError('');
    setLoading(true);
    try {
      await sendRegistrationOtp(formData.email);
      setError('OTP resent successfully.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (step === 1) {
      if (!formData.email.trim()) {
        setError('Enter a valid email address.');
        return;
      }
      setLoading(true);
      try {
        await sendRegistrationOtp(formData.email);
        setStep(2);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to send OTP. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (step === 2) {
      if (otpCode.replace(/\D/g, '').length !== 6) {
        setError('Enter the 6-digit code sent to your email.');
        return;
      }
      setLoading(true);
      try {
        await verifyRegistrationOtp(formData.email, otpCode);
        setStep(3);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Invalid OTP. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (step === 3 && !identityVerified) {
      const digits = identityValue.replace(/\D/g, '');
      if (digits.length !== 11) {
        setError(`Enter your 11-digit ${identityType.toUpperCase()}.`);
        return;
      }
      setLoading(true);
      try {
        const resolved = SAMPLE_PROFILES[identityType];
        setProfile(resolved);
        setIdentityVerified(true);
        if (resolved.phone) {
          setFormData((prev) => ({ ...prev, phone: resolved.phone }));
        }
        setStep(4);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (step === 3) {
      setStep(4);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const resolvedProfile = profile || SAMPLE_PROFILES[identityType];
      const { firstName, lastName } = buildNames(resolvedProfile.fullName);
      await register({
        firstName,
        lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        bvn: identityType === 'bvn' ? identityValue.replace(/\D/g, '') : undefined,
        nin: identityType === 'nin' ? identityValue.replace(/\D/g, '') : undefined,
      });
      navigate('/login', { state: { registered: true } });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#f6f7fb] dark:bg-[#0b1121] text-gray-900 dark:text-white">
      <div className="pointer-events-none absolute -top-32 -right-32 h-72 w-72 rounded-full bg-gradient-to-br from-[#235697]/30 to-[#7aa0d6]/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-gradient-to-tr from-[#114280]/20 to-[#5b8bd3]/30 blur-3xl" />

      <div className="relative max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/login"
            className="text-sm font-semibold text-[#235697] bg-white/80 dark:bg-white/10 border border-white/60 dark:border-white/10 px-4 py-2 rounded-full"
          >
            Back to sign in
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#235697]">
            <span className="h-2 w-2 rounded-full bg-[#235697]" />
            Tier 1 setup
          </div>
        </div>

        <div className="bg-white/90 dark:bg-gray-900/80 backdrop-blur border border-white/60 dark:border-white/10 rounded-[28px] shadow-[0_24px_60px_rgba(15,23,42,0.15)] p-8 md:p-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-gray-500 dark:text-gray-400 font-semibold">
                Registration
              </p>
              <h1 className="mt-3 text-3xl md:text-4xl font-['Fraunces'] font-semibold">
                {step === 1 && 'Start with your email'}
                {step === 2 && 'Confirm your OTP'}
                {step === 3 && 'Verify your identity'}
                {step === 4 && 'Set your password'}
              </h1>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 font-['Manrope']">
                {step === 1 && 'We only need your email to begin. We will send a verification code right away.'}
                {step === 2 && `Enter the 6-digit code sent to ${maskedEmail}.`}
                {step === 3 && 'Provide your NIN or BVN to auto-fill your profile and activate Tier 1.'}
                {step === 4 && 'Create a secure password to finish setting up your account.'}
              </p>
            </div>
            <div className="hidden md:flex flex-col items-end gap-2">
              <span className="text-xs text-gray-400">Step {step} of 4</span>
              <div className="w-32 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#235697] to-[#114280]"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 p-4 rounded-2xl text-sm">
                {error}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label htmlFor="registerEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Email Address
                  </label>
                  <input
                    id="registerEmail"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <ShieldCheck size={16} className="text-[#235697]" />
                  Your email is protected and used only for verification.
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
                    One-time password
                  </label>
                  <OTPInput
                    value={otpCode}
                    onChange={setOtpCode}
                    autoFocus
                    containerClassName="flex-wrap justify-center gap-3"
                    inputClassName="w-12 h-12 text-lg"
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>Didn&apos;t get a code?</span>
                  <button type="button" className="text-[#235697] font-semibold" onClick={handleResendOtp} disabled={loading}>
                    Resend OTP
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-[1fr_240px]">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Choose verification method
                    </label>
                    <div className="flex gap-2 p-1 rounded-2xl bg-gray-100 dark:bg-gray-800">
                      {(['nin', 'bvn'] as IdentityType[]).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setIdentityType(option);
                            setIdentityValue('');
                            setIdentityVerified(false);
                            setProfile(null);
                          }}
                          className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all ${
                            identityType === option
                              ? 'bg-white dark:bg-gray-900 text-[#235697] shadow'
                              : 'text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {option.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-4 text-xs text-gray-500 dark:text-gray-400">
                    <p className="font-semibold text-gray-700 dark:text-gray-200">Why this?</p>
                    <p className="mt-2">
                      We fetch your full name and DOB directly from {identityType.toUpperCase()} records to create your Tier 1 profile.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
                    Enter your {identityType.toUpperCase()}
                  </label>
                  <OTPInput
                    value={identityValue}
                    onChange={setIdentityValue}
                    length={11}
                    containerClassName="flex-wrap justify-center gap-2"
                    inputClassName="w-10 h-12 text-base sm:w-12 sm:h-12"
                  />
                </div>

                {identityVerified && profile && (
                  <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-900/20 p-5 space-y-4">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-sm font-semibold">
                      <Check size={18} /> Identity verified
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 text-sm">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Full name</p>
                        <p className="font-semibold text-gray-800 dark:text-gray-100">{profile.fullName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Date of birth</p>
                        <p className="font-semibold text-gray-800 dark:text-gray-100">{profile.dob}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Gender</p>
                        <p className="font-semibold text-gray-800 dark:text-gray-100">{profile.gender}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{identityType.toUpperCase()}</p>
                        <p className="font-semibold text-gray-800 dark:text-gray-100">{maskedId}</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Address on file: <span className="font-medium text-gray-700 dark:text-gray-200">{profile.address}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                {identityVerified && profile && (
                  <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-900/20 p-5 space-y-4">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-sm font-semibold">
                      <Check size={18} /> Identity verified
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 text-sm">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Full name</p>
                        <p className="font-semibold text-gray-800 dark:text-gray-100">{profile.fullName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Date of birth</p>
                        <p className="font-semibold text-gray-800 dark:text-gray-100">{profile.dob}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Gender</p>
                        <p className="font-semibold text-gray-800 dark:text-gray-100">{profile.gender}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{identityType.toUpperCase()}</p>
                        <p className="font-semibold text-gray-800 dark:text-gray-100">{maskedId}</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Address on file: <span className="font-medium text-gray-700 dark:text-gray-200">{profile.address}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label htmlFor="registerPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Phone Number
                    </label>
                    <PhoneInput
                      placeholder="8000000000"
                      value={formData.phone}
                      onChange={(value) => setFormData({ ...formData, phone: value })}
                      countryCode={phoneCountry}
                      onCountryChange={setPhoneCountry}
                      inputId="registerPhone"
                    />
                  </div>

                  <div>
                    <label htmlFor="registerPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Create password
                    </label>
                    <input
                      id="registerPassword"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                      placeholder="Choose a strong password"
                      required
                    />
                    <div className="mt-3">
                      <PasswordStrengthIndicator password={formData.password} />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="registerConfirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Confirm password
                    </label>
                    <input
                      id="registerConfirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#235697]"
                      placeholder="Re-enter your password"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setStep((prev) => (prev === 1 ? 1 : ((prev - 1) as 1 | 2 | 3)));
                    setError('');
                  }}
                  className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-4 rounded-2xl font-semibold"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-[#235697] to-[#114280] text-white py-4 rounded-2xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : step === 1 ? (
                  'Continue'
                ) : step === 2 ? (
                  'Verify OTP'
                ) : step === 3 ? (
                  `Verify ${identityType.toUpperCase()}`
                ) : identityVerified ? (
                  'Create Account'
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-[#235697] font-semibold">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
