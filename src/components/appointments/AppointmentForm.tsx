import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';

interface Tailor { id: string; name: string; }
interface Customer { id: string; name: string; }

interface AppointmentFormProps {
  role?: 'CUSTOMER' | 'TAILOR' | 'ADMIN';
  defaultTailorId?: string;
  onSuccess?: () => void;
}

export function AppointmentForm({ role = 'CUSTOMER', defaultTailorId, onSuccess }: AppointmentFormProps) {
  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState({
    customerId: '',
    type: 'MEASUREMENT',
    tailorId: defaultTailorId || '',
    scheduledAt: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [capacityError, setCapacityError] = useState('');

  useEffect(() => {
    // Fetch Tailors
    fetch('/api/users?role=TAILOR')
      .then((r) => r.json())
      .then((data) => {
        const tailorUsers = (data.users || []).filter((u: any) => u.role === 'TAILOR');
        setTailors(tailorUsers.map((u: any) => ({
          id: u.tailorProfile?.id,
          name: u.tailorProfile?.name || u.email,
        })).filter((t: any) => t.id));
      })
      .catch(() => {});

    // Fetch Customers if not a customer
    if (role !== 'CUSTOMER') {
      fetch('/api/users?role=CUSTOMER')
        .then(r => r.json())
        .then(data => {
          const profiles = (data.users || []).map((u: any) => u.customerProfile).filter(Boolean);
          setCustomers(profiles);
        });
    }
  }, [role]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.scheduledAt) { toast.error('Please select a date and time'); return; }
    if (role !== 'CUSTOMER' && !form.customerId) { toast.error('Please select a customer'); return; }
    setCapacityError('');
    setLoading(true);

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: role !== 'CUSTOMER' ? form.customerId : undefined,
          type: form.type,
          tailorId: form.tailorId || undefined,
          scheduledAt: new Date(form.scheduledAt).toISOString(),
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setCapacityError(data.error);
        } else {
          toast.error(data.error || 'Failed to book appointment');
        }
        return;
      }
      toast.success(role === 'CUSTOMER' ? 'Appointment request submitted!' : 'Appointment booked!');
      onSuccess?.();
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }

  const typeOptions = [
    { value: 'MEASUREMENT', label: 'Measurement' },
    { value: 'TRIAL', label: 'Trial Fitting' },
    { value: 'CONSULTATION', label: 'Consultation' },
  ];

  const tailorOptions = [
    { value: '', label: 'Any available tailor' },
    ...tailors.map((t) => ({ value: t.id, label: t.name })),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {role !== 'CUSTOMER' && (
        <Select
          label="Select Customer"
          placeholder="Search customer..."
          value={form.customerId}
          onChange={(e) => setForm({ ...form, customerId: e.target.value })}
          options={customers.map(c => ({ value: c.id, label: c.name }))}
          required
        />
      )}
      <Select label="Appointment Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={typeOptions} />
      <Select
        label="Preferred Tailor"
        value={form.tailorId}
        onChange={(e) => { setForm({ ...form, tailorId: e.target.value }); setCapacityError(''); }}
        options={tailorOptions}
        disabled={role === 'TAILOR' || !!defaultTailorId}
      />
      <Input
        label="Date & Time"
        type="datetime-local"
        value={form.scheduledAt}
        onChange={(e) => { setForm({ ...form, scheduledAt: e.target.value }); setCapacityError(''); }}
        min={new Date().toISOString().slice(0, 16)}
      />
      {capacityError && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <span className="shrink-0 mt-0.5">⚠️</span>
          <span>{capacityError}</span>
        </div>
      )}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
        <textarea
          rows={3}
          placeholder="Any specific requirements..."
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <Button type="submit" loading={loading} className="w-full">
        {role === 'CUSTOMER' ? 'Request Appointment' : 'Book Appointment'}
      </Button>
    </form>
  );
}

export default AppointmentForm;
