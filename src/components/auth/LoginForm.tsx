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

      if (data.requiresVerification) {
        toast.info('A verification code has been sent to your email.');
        setTimeout(() => {
          window.location.href = `/verify-otp?email=${encodeURIComponent(data.email)}&from=login`;
        }, 800);
        return;
      }

      if (!res.ok) {
        toast.error(data.error || 'Login failed');
        return;
      }

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

      <div className="text-center">
        <p className="text-sm text-gray-500">
          Don't have an account?{' '}
          <a href="/register" className="text-indigo-600 font-medium hover:underline">
            Create one
          </a>
        </p>
      </div>

    </form>
  );
}

export default LoginForm;
