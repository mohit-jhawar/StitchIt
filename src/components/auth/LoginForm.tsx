import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';

export function LoginForm() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [unverified, setUnverified] = useState(false);
  const [isResending, setIsResending] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.password) e.password = 'Password is required';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) setUnverified(true);
        toast.error(data.error || 'Login failed');
        return;
      }

      setUnverified(false);

      toast.success(`Welcome back, ${data.user.name || data.user.email}!`);

      // Redirect based on role
      setTimeout(() => {
        window.location.href = data.user.role === 'ADMIN' ? '/dashboard/admin' : '/dashboard';
      }, 100);
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    setIsResending(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Verification link resent! Please check your inbox.');
        setUnverified(false);
      } else {
        toast.error(data.error || 'Failed to resend link');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setIsResending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="relative">
        <div className="absolute left-3 top-9 text-gray-400">
          <FiMail className="w-4 h-4" />
        </div>
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={errors.email}
          className="pl-10"
          autoComplete="email"
        />
      </div>

      <div className="relative">
        <div className="absolute left-3 top-9 text-gray-400">
          <FiLock className="w-4 h-4" />
        </div>
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Enter your password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={errors.password}
          className="pl-10 pr-10"
          autoComplete="current-password"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
        >
          {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex justify-end -mt-1">
        <a href="/forgot-password" className="text-xs text-indigo-600 hover:underline">
          Forgot password?
        </a>
      </div>

      <Button type="submit" loading={loading} className="w-full" size="lg">
        Sign in
      </Button>

      {unverified && (
        <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100 animate-in fade-in slide-in-from-top-2">
          <p className="text-xs text-indigo-700 mb-2 font-medium">Email not verified yet?</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full text-xs"
            loading={isResending}
            onClick={handleResendVerification}
          >
            Resend verification link
          </Button>
        </div>
      )}

      <div className="text-center">
        <p className="text-sm text-gray-500">
          Don't have an account?{' '}
          <a href="/register" className="text-indigo-600 font-medium hover:underline">
            Create one
          </a>
        </p>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-400 text-center mb-2">Demo accounts:</p>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {[
            { label: 'Admin', email: 'admin@stitchit.com', pass: 'admin123' },
            { label: 'Tailor', email: 'tailor@stitchit.com', pass: 'tailor123' },
            { label: 'Customer', email: 'customer@stitchit.com', pass: 'customer123' },
          ].map((demo) => (
            <button
              key={demo.label}
              type="button"
              onClick={() => setForm({ email: demo.email, password: demo.pass })}
              className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors"
            >
              {demo.label}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}

export default LoginForm;
