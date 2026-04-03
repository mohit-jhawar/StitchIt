import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from '../ui/Toast';

interface OtpFormProps {
  email: string;
  from?: string;
}

const TOTAL_SECONDS = 600; // 10 minutes
const RESEND_COOLDOWN = 60; // seconds before resend is allowed

export function OtpForm({ email, from = 'register' }: OtpFormProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);
  const [filled, setFilled] = useState(false);

  const ref0 = useRef<HTMLInputElement>(null);
  const ref1 = useRef<HTMLInputElement>(null);
  const ref2 = useRef<HTMLInputElement>(null);
  const ref3 = useRef<HTMLInputElement>(null);
  const ref4 = useRef<HTMLInputElement>(null);
  const ref5 = useRef<HTMLInputElement>(null);
  const inputRefs = [ref0, ref1, ref2, ref3, ref4, ref5];

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Track if all digits are filled
  useEffect(() => {
    setFilled(otp.every((d) => d !== ''));
  }, [otp]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // SVG ring progress (r=20 → circumference ≈ 125.7)
  const radius = 20;
  const circumference = 2 * Math.PI * (radius + 16);
  const progress = timeLeft / TOTAL_SECONDS;
  const dashOffset = circumference * (1 - progress);
  const isLow = timeLeft < 60;
  const isExpired = timeLeft <= 0;

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      const next = [...otp];
      next[index] = '';
      setOtp(next);
      return;
    }
    const char = val[val.length - 1];
    const next = [...otp];
    next[index] = char;
    setOtp(next);
    if (index < 5) inputRefs[index + 1].current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const next = [...otp];
        next[index] = '';
        setOtp(next);
      } else if (index > 0) {
        inputRefs[index - 1].current?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const data = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (data.length !== 6) return;
    setOtp(data.split(''));
    inputRefs[5].current?.focus();
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      triggerShake();
      toast.error('Please enter the full 6-digit code');
      return;
    }
    if (isExpired) {
      triggerShake();
      toast.error('Your OTP has expired. Please request a new one.');
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
        triggerShake();
        setOtp(['', '', '', '', '', '']);
        inputRefs[0].current?.focus();
        toast.error(data.error || 'Verification failed');
        return;
      }
      setSuccess(true);
      toast.success('Email verified! Redirecting…');
      setTimeout(() => {
        window.location.href = '/login?success=Verification successful! You can now log in.';
      }, 1800);
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (loading || timeLeft > TOTAL_SECONDS - RESEND_COOLDOWN) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('A new code has been sent!');
        setTimeLeft(TOTAL_SECONDS);
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

  const canResend = timeLeft <= TOTAL_SECONDS - RESEND_COOLDOWN;

  return (
    <>
      <div className="otp-root w-full">
        {/* ── Header ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px', textAlign: 'center' }}>
          {/* Icon with ring */}
          <div style={{ position: 'relative', width: 72, height: 72, marginBottom: 16 }}>
            <svg width="72" height="72" viewBox="0 0 72 72" style={{ position: 'absolute', inset: 0 }}>
              <circle className="ring-track" cx="36" cy="36" r={radius + 16} fill="none" strokeWidth={3} />
              <circle
                className={`ring-fill${isLow ? ' low' : ''}`}
                cx="36" cy="36" r={radius + 16}
                fill="none"
                strokeWidth={3}
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{
                  stroke: isLow ? '#ef4444' : '#6366f1',
                  strokeLinecap: 'round',
                  transform: 'rotate(-90deg)',
                  transformOrigin: '50% 50%',
                }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center',
              background: success ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              borderRadius: '50%',
              margin: '8px',
              transition: 'background 0.4s',
            }}>
              {success ? (
                <svg className="success-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              )}
            </div>
          </div>

          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            {success ? 'Verified!' : 'Email Verification'}
          </h1>
          {!success && (
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 8, lineHeight: 1.5 }}>
              We sent a 6-digit code to
            </p>
          )}
          {!success && (
            <span className="email-chip">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
              {email}
            </span>
          )}
        </div>

        {/* ── OTP Inputs ── */}
        {!success && (
          <form onSubmit={handleSubmit}>
            <div
              className={shake ? 'shake' : ''}
              style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}
              onPaste={handlePaste}
            >
              {otp.map((digit, i) => (
                <OtpDigit
                  key={i}
                  inputRef={inputRefs[i]}
                  value={digit}
                  onChange={(e) => handleChange(e, i)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  disabled={loading || isExpired}
                />
              ))}
            </div>

            {/* Timer row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={isLow ? '#ef4444' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Code expires in</span>
              <span style={{
                fontFamily: 'monospace',
                fontWeight: 700,
                fontSize: '0.9rem',
                color: isLow ? '#ef4444' : '#6366f1',
                transition: 'color 0.3s',
                minWidth: 36,
              }}>
                {isExpired ? 'Expired' : formatTime(timeLeft)}
              </span>
            </div>

            {/* Progress bar */}
            <div style={{ height: 3, borderRadius: 999, background: '#f1f5f9', marginBottom: 28, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(timeLeft / TOTAL_SECONDS) * 100}%`,
                borderRadius: 999,
                background: isLow
                  ? 'linear-gradient(90deg,#fca5a5,#ef4444)'
                  : 'linear-gradient(90deg,#818cf8,#6366f1)',
                transition: 'width 1s linear, background 0.4s',
              }} />
            </div>

            {/* Verify button */}
            <button
              type="submit"
              disabled={loading || isExpired || !filled}
              className={`btn-verify${loading ? ' loading' : ''}${success ? ' success-btn' : ''}`}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="4"/>
                    <path d="M4 12a8 8 0 018-8" stroke="white" strokeWidth="4" strokeLinecap="round"/>
                  </svg>
                  Verifying…
                </span>
              ) : isExpired ? 'Code Expired' : 'Verify Account'}
            </button>

            {/* Resend + Back row */}
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                {canResend ? (
                  <>
                    Didn't receive it?{' '}
                    <button type="button" className="resend-btn" onClick={handleResend} disabled={loading}>
                      Resend code
                    </button>
                  </>
                ) : (
                  <>
                    Resend available in{' '}
                    <span style={{ fontWeight: 700, color: '#6366f1' }}>{timeLeft - (TOTAL_SECONDS - RESEND_COOLDOWN)}s</span>
                  </>
                )}
              </div>

              <a
                href={from === 'login' ? '/login' : '/register'}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: '0.85rem', color: '#94a3b8', textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#475569')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                {from === 'login' ? 'Back to login' : 'Use a different email'}
              </a>
            </div>
          </form>
        )}

        {/* ── Success state ── */}
        {success && (
          <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
            <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Your email has been verified.<br />Redirecting you to login…
            </p>
            <div style={{ marginTop: 24 }}>
              <div style={{
                display: 'inline-block',
                width: 32, height: 4, borderRadius: 999,
                background: 'linear-gradient(90deg,#10b981,#6366f1)',
                animation: 'shimmer 1.2s ease-in-out infinite alternate',
              }} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Digit input sub-component ──────────────────────────────────────────────
interface OtpDigitProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

function OtpDigit({ inputRef, value, onChange, onKeyDown, disabled }: OtpDigitProps) {
  const [focused, setFocused] = useState(false);

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      maxLength={1}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      disabled={disabled}
      className={`otp-digit${value ? ' filled' : ''}${focused ? ' focused' : ''}`}
      autoComplete="one-time-code"
    />
  );
}
