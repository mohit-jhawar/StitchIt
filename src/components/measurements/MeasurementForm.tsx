import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

interface Measurement {
  id?: string;
  name?: string;
  chest?: number;
  waist?: number;
  hip?: number;
  shoulder?: number;
  sleeve?: number;
  length?: number;
  inseam?: number;
  neck?: number;
  notes?: string;
}

interface MeasurementFormProps {
  measurement?: Measurement | null;
  role?: 'CUSTOMER' | 'TAILOR' | 'ADMIN';
  onSuccess?: () => void;
}

interface Customer { id: string; name: string; }

export function MeasurementForm({ measurement, role = 'CUSTOMER', onSuccess }: MeasurementFormProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState({
    customerId: '',
    name: measurement?.name || '',
    chest: measurement?.chest?.toString() || '',
    waist: measurement?.waist?.toString() || '',
    hip: measurement?.hip?.toString() || '',
    shoulder: measurement?.shoulder?.toString() || '',
    sleeve: measurement?.sleeve?.toString() || '',
    length: measurement?.length?.toString() || '',
    inseam: measurement?.inseam?.toString() || '',
    neck: measurement?.neck?.toString() || '',
    notes: measurement?.notes || '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (role !== 'CUSTOMER') {
      fetch('/api/users?role=CUSTOMER')
        .then(r => r.json())
        .then(data => {
          const profiles = (data.users || []).map((u: any) => u.customerProfile).filter(Boolean);
          setCustomers(profiles);
        });
    }
  }, [role]);

  function toFloat(v: string) { const n = parseFloat(v); return isNaN(n) ? undefined : n; }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (role !== 'CUSTOMER' && !measurement?.id && !form.customerId) {
      toast.error('Customer is required');
      return;
    }
    setLoading(true);

    const body: any = {
      customerId: role !== 'CUSTOMER' ? form.customerId : undefined,
      name: form.name,
      notes: form.notes || undefined,
      chest: toFloat(form.chest),
      waist: toFloat(form.waist),
      hip: toFloat(form.hip),
      shoulder: toFloat(form.shoulder),
      sleeve: toFloat(form.sleeve),
      length: toFloat(form.length),
      inseam: toFloat(form.inseam),
      neck: toFloat(form.neck),
    };

    try {
      const url = measurement?.id ? `/api/measurements/${measurement.id}` : '/api/measurements';
      const method = measurement?.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed'); return; }
      toast.success(measurement?.id ? 'Measurement updated' : 'Measurement saved');
      onSuccess?.();
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { key: 'chest', label: 'Chest (inches)' },
    { key: 'waist', label: 'Waist (inches)' },
    { key: 'hip', label: 'Hip (inches)' },
    { key: 'shoulder', label: 'Shoulder (inches)' },
    { key: 'sleeve', label: 'Sleeve (inches)' },
    { key: 'length', label: 'Length (inches)' },
    { key: 'inseam', label: 'Inseam (inches)' },
    { key: 'neck', label: 'Neck (inches)' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {role !== 'CUSTOMER' && !measurement?.id && (
        <Select
          label="Select Customer"
          placeholder="Search customer..."
          value={form.customerId}
          onChange={(e) => setForm({ ...form, customerId: e.target.value })}
          options={customers.map(c => ({ value: c.id, label: c.name }))}
          required
        />
      )}

      <Input
        label="Measurement Name"
        placeholder="e.g. Wedding Suit, Casual Shirt"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {fields.map((f) => (
          <Input
            key={f.key}
            label={f.label}
            type="number"
            step="0.5"
            min="0"
            placeholder="0"
            value={(form as any)[f.key]}
            onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
          />
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Notes</label>
        <textarea
          rows={3}
          placeholder="Any special notes..."
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <Button type="submit" loading={loading} className="w-full">
        {measurement?.id ? 'Update Measurement' : 'Save Measurement'}
      </Button>
    </form>
  );
}

export default MeasurementForm;
