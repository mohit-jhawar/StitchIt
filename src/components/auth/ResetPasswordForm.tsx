import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { FiLock, FiEye, FiEyeOff, FiCheckCircle } from 'react-icons/fi';

interface Props {
  token: string;
}

export function ResetPasswordForm({ token }: Props) {
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (!form.confirm) e.confirm = 'Please confirm your password';
    else if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: form.password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to reset password. The link may have expired.');
        return;
      }

      setDone(true);
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <p className="text-red-600 font-medium">Invalid reset link.</p>
        <a href="/forgot-password" className="text-sm text-indigo-600 hover:underline">
          Request a new one
        </a>
      </div>
    );
  }

  if (done) {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm text-gray-500">Choose a strong password with at least 8 characters.</p>

      <div className="relative">
        <div className="absolute left-3 top-9 text-gray-400">
          <FiLock className="w-4 h-4" />
        </div>
        <Input
          label="New password"
          type={showPassword ? 'text' : 'password'}
          placeholder="At least 8 characters"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={errors.password}
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
          value={form.confirm}
          onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          error={errors.confirm}
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

      <Button type="submit" loading={loading} className="w-full" size="lg">
        Set new password
      </Button>

      <div className="text-center">
        <a href="/login" className="text-sm text-gray-500 hover:text-indigo-600 transition-colors">
          Back to sign in
        </a>
      </div>
    </form>
  );
}

export default ResetPasswordForm;
