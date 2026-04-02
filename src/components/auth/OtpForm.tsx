import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { FiMail, FiShield, FiArrowLeft, FiClock } from 'react-icons/fi';

interface OtpFormProps {
  email: string;
}

export function OtpForm({ email }: OtpFormProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes (600 seconds)
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    if (isNaN(Number(value))) return;

    const newOtp = [...otp];
    // Only take the last character if multiple are entered
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-focus move next
    if (value && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    // Handle backspace move back
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const data = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(data)) return;

    const digits = data.split('').slice(0, 6);
    const newOtp = [...otp];
    digits.forEach((digit, index) => {
      newOtp[index] = digit;
    });
    setOtp(newOtp);
    inputRefs[5].current?.focus();
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      toast.error('Please enter the full 6-digit code');
      return;
    }

    if (timeLeft <= 0) {
      toast.error('Your OTP has expired. Please register again.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Verification failed');
        return;
      }

      toast.success('Email verified successfully!');
      setTimeout(() => {
        window.location.href = '/login?success=Verification successful! You can now log in.';
      }, 2000);
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('A new OTP has been sent to your email.');
        setTimeLeft(600); // Reset timer
        setOtp(['', '', '', '', '', '']);
        inputRefs[0].current?.focus();
      } else {
        toast.error(data.error || 'Failed to resend OTP');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
          <FiShield className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Email Verification</h1>
        <p className="text-gray-500 mt-2 text-center">
          We've sent a 6-digit verification code to <br />
          <span className="font-semibold text-gray-900">{email}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="flex justify-between gap-2 sm:gap-4" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={inputRefs[index]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="w-12 h-16 sm:w-16 sm:h-20 text-center text-3xl font-bold border-2 border-gray-100 rounded-2xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
            />
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <FiClock className="w-4 h-4" />
          <span>Code expires in: </span>
          <span className={`font-mono font-bold ${timeLeft < 60 ? 'text-red-500' : 'text-indigo-600'}`}>
            {formatTime(timeLeft)}
          </span>
        </div>

        <Button type="submit" loading={loading} className="w-full py-4 text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all" size="lg">
          Verify Account
        </Button>

        <div className="flex flex-col gap-4 text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={timeLeft > 540 || loading}
            className="text-indigo-600 font-semibold hover:text-indigo-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {timeLeft > 540 ? `Resend code in ${timeLeft - 540}s` : 'Resend verification code'}
          </button>

          <a href="/register" className="inline-flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 transition-colors">
            <FiArrowLeft className="w-4 h-4" />
            <span>Use a different email</span>
          </a>
        </div>
      </form>
    </div>
  );
}
