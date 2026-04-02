import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { FiMail, FiArrowLeft, FiShield, FiClock, FiLock, FiEye, FiEyeOff, FiCheckCircle } from 'react-icons/fi';

type Step = 'email' | 'otp' | 'password' | 'done';

export function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // OTP step
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Password step
  const [resetToken, setResetToken] = useState('');
  const [passwords, setPasswords] = useState({ password: '', confirm: '' });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Countdown timer for OTP step
  useEffect(() => {
    if (step !== 'otp' || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // ── Step 1: Send OTP ──────────────────────────────────────────────────────

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setEmailError('');
    setEmailLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) toast.error('Too many requests. Please wait a few minutes.');
        else toast.error(data.error || 'Something went wrong.');
        return;
      }
      setTimeLeft(600);
      setOtp(['', '', '', '', '', '']);
      setStep('otp');
      setTimeout(() => inputRefs[0].current?.focus(), 100);
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  }

  // ── OTP input handlers ────────────────────────────────────────────────────

  function handleOtpChange(e: React.ChangeEvent<HTMLInputElement>, index: number) {
    const value = e.target.value;
    if (isNaN(Number(value))) return;
    const next = [...otp];
    next[index] = value.substring(value.length - 1);
    setOtp(next);
    if (value && index < 5) inputRefs[index + 1].current?.focus();
  }

  function handleOtpKeyDown(e: React.KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const data = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(data)) return;
    const digits = data.split('');
    setOtp(digits);
    inputRefs[5].current?.focus();
  }

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) { toast.error('Please enter the full 6-digit code'); return; }
    if (timeLeft <= 0) { toast.error('OTP has expired. Please request a new one.'); return; }

    setOtpLoading(true);
    try {
      const res = await fetch('/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Invalid OTP. Please try again.');
        return;
      }
      setResetToken(data.resetToken);
      setStep('password');
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleResendOtp() {
    if (otpLoading) return;
    setOtpLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('A new OTP has been sent to your email.');
        setTimeLeft(600);
        setOtp(['', '', '', '', '', '']);
        inputRefs[0].current?.focus();
      } else {
        toast.error(data.error || 'Failed to resend OTP');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setOtpLoading(false);
    }
  }

  // ── Step 3: Set new password ──────────────────────────────────────────────

  function validatePasswords() {
    const e: Record<string, string> = {};
    if (!passwords.password) e.password = 'Password is required';
    else if (passwords.password.length < 8) e.password = 'Password must be at least 8 characters';
    else if (passwords.password.length > 72) e.password = 'Password is too long';
    else if (!/[A-Za-z]/.test(passwords.password)) e.password = 'Must contain at least one letter';
    else if (!/[0-9]/.test(passwords.password)) e.password = 'Must contain at least one number';
    if (!passwords.confirm) e.confirm = 'Please confirm your password';
    else if (passwords.password !== passwords.confirm) e.confirm = 'Passwords do not match';
    return e;
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    const errs = validatePasswords();
    if (Object.keys(errs).length) { setPasswordErrors(errs); return; }
    setPasswordErrors({});
    setPasswordLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password: passwords.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to reset password.');
        return;
      }
      setStep('done');
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (step === 'done') {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <FiCheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Password updated!</h2>
        <p className="text-sm text-gray-500">Your password has been reset successfully.</p>
        <a
          href="/login"
          className="inline-block mt-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Sign in now
        </a>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div className="w-full">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-3">
            <FiShield className="w-7 h-7" />
          </div>
          <p className="text-sm text-gray-500 text-center">
            We sent a 6-digit code to <span className="font-semibold text-gray-800">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerifyOtp} className="space-y-6">
          <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={inputRefs[index]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(e, index)}
                onKeyDown={(e) => handleOtpKeyDown(e, index)}
                className="w-11 h-14 text-center text-2xl font-bold border-2 border-gray-100 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
              />
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <FiClock className="w-4 h-4" />
            <span>Expires in</span>
            <span className={`font-mono font-bold ${timeLeft < 60 ? 'text-red-500' : 'text-indigo-600'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>

          <Button type="submit" loading={otpLoading} className="w-full" size="lg">
            Verify OTP
          </Button>

          <div className="flex flex-col gap-3 text-center">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={timeLeft > 540 || otpLoading}
              className="text-sm text-indigo-600 font-medium hover:text-indigo-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {timeLeft > 540 ? `Resend code in ${timeLeft - 540}s` : 'Resend code'}
            </button>
            <button
              type="button"
              onClick={() => setStep('email')}
              className="inline-flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <FiArrowLeft className="w-4 h-4" />
              Use a different email
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (step === 'password') {
    return (
      <form onSubmit={handleSetPassword} className="space-y-5">
        <p className="text-sm text-gray-500">Choose a strong password with at least 8 characters.</p>

        <div className="relative">
          <div className="absolute left-3 top-9 text-gray-400">
            <FiLock className="w-4 h-4" />
          </div>
          <Input
            label="New password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Min 8 chars, include a number"
            value={passwords.password}
            onChange={(e) => setPasswords({ ...passwords, password: e.target.value })}
            error={passwordErrors.password}
            className="pl-10 pr-10"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
          </button>
        </div>

        <div className="relative">
          <div className="absolute left-3 top-9 text-gray-400">
            <FiLock className="w-4 h-4" />
          </div>
          <Input
            label="Confirm new password"
            type={showConfirm ? 'text' : 'password'}
            placeholder="Repeat your password"
            value={passwords.confirm}
            onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
            error={passwordErrors.confirm}
            className="pl-10 pr-10"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
          >
            {showConfirm ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
          </button>
        </div>

        <Button type="submit" loading={passwordLoading} className="w-full" size="lg">
          Set new password
        </Button>
      </form>
    );
  }

  // step === 'email'
  return (
    <form onSubmit={handleSendOtp} className="space-y-5">
      <p className="text-sm text-gray-500">
        Enter your account email and we'll send you a 6-digit OTP to reset your password.
      </p>

      <div className="relative">
        <div className="absolute left-3 top-9 text-gray-400">
          <FiMail className="w-4 h-4" />
        </div>
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={emailError}
          className="pl-10"
          autoComplete="email"
        />
      </div>

      <Button type="submit" loading={emailLoading} className="w-full" size="lg">
        Send OTP
      </Button>

      <div className="text-center">
        <a
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" />
          Back to sign in
        </a>
      </div>
    </form>
  );
}

export default ForgotPasswordForm;
