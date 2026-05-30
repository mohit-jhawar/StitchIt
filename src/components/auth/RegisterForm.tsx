import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { FiUser, FiMail, FiLock, FiPhone, FiScissors, FiCheckCircle } from 'react-icons/fi';

export function RegisterForm() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'CUSTOMER',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    else if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!form.email) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email address';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    else if (form.password.length > 72) e.password = 'Password is too long';
    else if (!/[A-Za-z]/.test(form.password)) e.password = 'Password must contain at least one letter';
    else if (!/[0-9]/.test(form.password)) e.password = 'Password must contain at least one number';
    if (!form.confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (form.phone && !/^[+]?[\d\s\-()\u0966-\u096F]{7,15}$/.test(form.phone))
      e.phone = 'Invalid phone number';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
          role: form.role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Registration failed');
        return;
      }

      toast.success(data.message || 'Account created! Redirecting to verification...');
      
      setTimeout(() => { 
        window.location.href = `/verify-otp?email=${form.email}`; 
      }, 2000);
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <div className="absolute left-3 top-9 text-gray-400"><FiUser className="w-4 h-4" /></div>
        <Input
          label="Full Name"
          type="text"
          placeholder="John Doe"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          error={errors.name}
          className="pl-10"
        />
      </div>

      <div className="relative">
        <div className="absolute left-3 top-9 text-gray-400"><FiMail className="w-4 h-4" /></div>
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={errors.email}
          className="pl-10"
        />
      </div>

      <div className="relative">
        <div className="absolute left-3 top-9 text-gray-400"><FiPhone className="w-4 h-4" /></div>
        <Input
          label="Phone (optional)"
          type="tel"
          placeholder="+91 98765 43210"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          error={errors.phone}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="relative">
          <div className="absolute left-3 top-9 text-gray-400"><FiLock className="w-4 h-4" /></div>
          <Input
            label="Password"
            type="password"
            placeholder="Min 8 chars, include a number"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={errors.password}
            className="pl-10"
          />
        </div>
        <div className="relative">
          <div className="absolute left-3 top-9 text-gray-400"><FiLock className="w-4 h-4" /></div>
          <Input
            label="Confirm Password"
            type="password"
            placeholder="Repeat password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            error={errors.confirmPassword}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-700 block">Register as</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { 
              id: 'CUSTOMER', 
              label: 'Customer', 
              desc: 'Order services', 
              icon: FiUser, 
              styles: {
                active: 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600/20',
                iconActive: 'bg-indigo-600 text-white',
                textActive: 'text-indigo-900'
              }
            },
            { 
              id: 'TAILOR', 
              label: 'Tailor', 
              desc: 'Provide work', 
              icon: FiScissors, 
              styles: {
                active: 'border-purple-600 bg-purple-50 ring-1 ring-purple-600/20',
                iconActive: 'bg-purple-600 text-white',
                textActive: 'text-purple-900'
              }
            },
          ].map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => setForm({ ...form, role: role.id })}
              className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all text-center group ${
                form.role === role.id 
                  ? role.styles.active
                  : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-transform group-hover:scale-110 ${
                form.role === role.id ? role.styles.iconActive : 'bg-gray-100 text-gray-500'
              }`}>
                <role.icon className="w-5 h-5" />
              </div>
              <p className={`text-xs font-bold ${form.role === role.id ? role.styles.textActive : 'text-gray-900'}`}>{role.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{role.desc}</p>
              
              {form.role === role.id && (
                <div className="absolute top-2 right-2 text-current animate-in zoom-in duration-300">
                  <FiCheckCircle className="w-4 h-4" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
        Create Account
      </Button>

      <div className="text-center">
        <p className="text-sm text-gray-500">
          Already have an account?{' '}
          <a href="/login" className="text-indigo-600 font-medium hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </form>
  );
}

export default RegisterForm;
