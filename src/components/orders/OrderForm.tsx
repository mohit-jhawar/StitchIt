import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { DesignPicker } from '../designs/DesignPicker';
import type { Design } from '../designs/DesignCard';
import { formatCurrency } from '../../lib/utils';
import { FiPlus, FiTrash2, FiAlertTriangle, FiCalendar, FiSliders, FiArrowRight } from 'react-icons/fi';

interface Service { id: string; name: string; basePrice: number; category: string; }
interface Fabric { id: string; name: string; pricePerMeter: number; type: string; }
interface Measurement { id: string; name: string; }

interface OrderItem {
  serviceId: string;
  fabricId: string;
  quantity: number;
  unitPrice: number;
  notes: string;
}

interface OrderFormProps {
  onSuccess?: () => void;
  role?: 'CUSTOMER' | 'TAILOR' | 'ADMIN';
}

interface Customer { id: string; name: string; }

export function OrderForm({ onSuccess, role = 'CUSTOMER' }: OrderFormProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [items, setItems] = useState<OrderItem[]>([
    { serviceId: '', fabricId: '', quantity: 1, unitPrice: 0, notes: '' }
  ]);
  const [form, setForm] = useState({
    customerId: '',
    priority: 'NORMAL',
    measurementId: '',
    deliveryDate: '',
    notes: '',
  });

  useEffect(() => {
    const promises = [
      fetch('/api/services?active=true').then((r) => r.json()),
      fetch('/api/fabrics?active=true').then((r) => r.json()),
    ];

    if (role === 'CUSTOMER') {
      promises.push(fetch('/api/measurements').then((r) => r.json()));
    } else {
      promises.push(fetch('/api/users?role=CUSTOMER').then((r) => r.json()));
    }

    Promise.all(promises).then(([svcs, fabs, third]) => {
      setServices(svcs);
      setFabrics(fabs);
      if (role === 'CUSTOMER') {
        setMeasurements(Array.isArray(third) ? third : []);
      } else {
        const profiles = (third.users || []).map((u: any) => u.customerProfile).filter(Boolean);
        setCustomers(profiles);
      }
      setDataLoaded(true);
    });
  }, [role]);

  // Handle measurement fetching when customer changes (for tailors)
  useEffect(() => {
    if (role !== 'CUSTOMER' && form.customerId) {
      fetch(`/api/measurements?customerId=${form.customerId}`)
        .then(r => r.json())
        .then(data => {
          setMeasurements(Array.isArray(data) ? data : []);
        });
    }
  }, [form.customerId, role]);

  // Show blocking dialog if no measurements exist (ONLY for customers)
  if (dataLoaded && role === 'CUSTOMER' && measurements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-5 border-4 border-amber-100">
          <FiAlertTriangle className="w-9 h-9 text-amber-500" />
        </div>

        {/* Heading */}
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Measurements Required
        </h3>
        <p className="text-gray-500 text-sm max-w-sm mb-6 leading-relaxed">
          To place an order, you first need to save your body measurements. 
          Book a fitting appointment with our tailor and we'll record your measurements for a perfect fit every time.
        </p>

        {/* Steps */}
        <div className="w-full max-w-sm bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-indigo-600">1</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                <FiCalendar className="w-3.5 h-3.5 text-indigo-500" /> Book an Appointment
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Schedule a fitting session with our tailor</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-indigo-600">2</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                <FiSliders className="w-3.5 h-3.5 text-indigo-500" /> Get Measured
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Your tailor will record your measurements during the session</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-indigo-600">3</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                <FiArrowRight className="w-3.5 h-3.5 text-indigo-500" /> Place Your Order
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Come back here once measurements are saved</p>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <a
            href="/dashboard/customer/appointments"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            <FiCalendar className="w-4 h-4" /> Book Appointment
          </a>
          <a
            href="/dashboard/customer/measurements"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
          >
            <FiSliders className="w-4 h-4" /> Add Manually
          </a>
        </div>
      </div>
    );
  }

  function handleDesignSelect(design: Design | null) {
    setSelectedDesign(design);
    if (design) {
      // Auto-fill the first order item with the design's service and price
      setItems((prev) => {
        const updated = [...prev];
        updated[0] = {
          ...updated[0],
          serviceId: design.service.id,
          unitPrice: design.basePrice ?? design.service.basePrice,
        };
        return updated;
      });
    }
  }

  function updateItem(index: number, field: keyof OrderItem, value: string | number) {
    const updated = [...items];
    if (field === 'serviceId') {
      const svc = services.find((s) => s.id === value);
      updated[index] = { ...updated[index], serviceId: value as string, unitPrice: svc?.basePrice || 0 };
    } else {
      (updated[index] as any)[field] = value;
    }
    setItems(updated);
  }

  function addItem() {
    setItems([...items, { serviceId: '', fabricId: '', quantity: 1, unitPrice: 0, notes: '' }]);
  }

  function removeItem(index: number) {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  }

  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.some((i) => !i.serviceId)) {
      toast.error('Please select a service for all items');
      return;
    }
    setLoading(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          customerId: role !== 'CUSTOMER' ? form.customerId : undefined,
          measurementId: form.measurementId || undefined,
          deliveryDate: form.deliveryDate || undefined,
          designId: selectedDesign?.id || undefined,
          items: items.map((i) => ({
            serviceId: i.serviceId,
            fabricId: i.fabricId || undefined,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            notes: i.notes || undefined,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to create order'); return; }
      toast.success(`Order ${data.orderNumber} created!`);
      onSuccess?.();
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }

  const serviceOptions = services.map((s) => ({ value: s.id, label: `${s.name} - ${formatCurrency(s.basePrice)}` }));
  const fabricOptions = [{ value: '', label: 'No fabric' }, ...fabrics.map((f) => ({ value: f.id, label: `${f.name} (${f.type})` }))];
  const measurementOptions = [{ value: '', label: 'No measurement' }, ...measurements.map((m) => ({ value: m.id, label: m.name }))];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {role !== 'CUSTOMER' && (
        <div className="bg-white p-4 border border-indigo-100 rounded-xl shadow-sm">
          <Select
            label="Select Customer"
            placeholder="Search for a customer..."
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value })}
            options={customers.map(c => ({ value: c.id, label: c.name }))}
            required
          />
        </div>
      )}

      {/* Design Picker */}
      <DesignPicker selectedDesign={selectedDesign} onSelect={handleDesignSelect} />

      {/* Order Items */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Order Items</h3>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-xl bg-gray-50">
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Service"
                  value={item.serviceId}
                  onChange={(e) => updateItem(index, 'serviceId', e.target.value)}
                  options={serviceOptions}
                  placeholder="Select service"
                />
                <Select
                  label="Fabric"
                  value={item.fabricId}
                  onChange={(e) => updateItem(index, 'fabricId', e.target.value)}
                  options={fabricOptions}
                />
                <Input
                  label="Quantity"
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                />
                <Input
                  label="Unit Price (₹)"
                  type="number"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm text-gray-500">
                  Subtotal: <strong>{formatCurrency(item.unitPrice * item.quantity)}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                  className="text-red-400 hover:text-red-600 disabled:opacity-30 p-1"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addItem}
          className="mt-3 flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          <FiPlus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Order Details */}
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Priority"
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value })}
          options={[
            { value: 'NORMAL', label: 'Normal' },
            { value: 'URGENT', label: 'Urgent' },
            { value: 'EXPRESS', label: 'Express' },
          ]}
        />
        <Select
          label="Measurement"
          value={form.measurementId}
          onChange={(e) => setForm({ ...form, measurementId: e.target.value })}
          options={measurementOptions}
        />
        <Input
          label="Delivery Date"
          type="date"
          value={form.deliveryDate}
          onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })}
        />
        <div />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Notes</label>
        <textarea
          rows={3}
          placeholder="Special instructions..."
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Total */}
      <div className="bg-indigo-50 rounded-xl p-4 flex items-center justify-between">
        <span className="font-semibold text-gray-900">Total Amount</span>
        <span className="text-2xl font-bold text-indigo-600">{formatCurrency(total)}</span>
      </div>

      <Button type="submit" loading={loading} className="w-full" size="lg">
        Create Order
      </Button>
    </form>
  );
}

export default OrderForm;
