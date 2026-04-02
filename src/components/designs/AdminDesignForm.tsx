import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import type { Design } from './DesignCard';
import { FiUpload, FiX, FiImage } from 'react-icons/fi';

interface Service { id: string; name: string; basePrice: number; category: string; }

interface AdminDesignFormProps {
  design?: Design | null;
  onSuccess: (design: Design) => void;
  onCancel: () => void;
}

const CATEGORIES = ['Formal', 'Ethnic', 'Casual', 'Bridal', 'Kids', 'Sportswear', 'Other'];

export function AdminDesignForm({ design, onSuccess, onCancel }: AdminDesignFormProps) {
  const isEdit = !!design;
  const [services, setServices] = useState<Service[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: design?.name || '',
    description: design?.description || '',
    category: design?.category || 'Ethnic',
    serviceId: design?.service.id || '',
    tags: design?.tags || '',
    basePrice: design?.basePrice ? String(design.basePrice) : '',
    isActive: design?.isActive ?? true,
  });
  const [images, setImages] = useState<string[]>(design?.images || []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/services?active=true')
      .then((r) => r.json())
      .then(setServices)
      .catch(() => {});
  }, []);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (images.length + files.length > 5) {
      toast.error('Maximum 5 images per design');
      return;
    }

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        uploaded.push(data.url);
      }
      setImages((prev) => [...prev, ...uploaded]);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!form.category) e.category = 'Category is required';
    if (!form.serviceId) e.serviceId = 'Please select a service';
    if (images.length === 0) e.images = 'At least one image is required';
    if (form.basePrice && isNaN(parseFloat(form.basePrice))) e.basePrice = 'Invalid price';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category,
      serviceId: form.serviceId,
      images,
      tags: form.tags.trim() || null,
      basePrice: form.basePrice ? parseFloat(form.basePrice) : null,
      isActive: form.isActive,
    };

    try {
      const url = isEdit ? `/api/designs/${design!.id}` : '/api/designs';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to save design'); return; }
      toast.success(isEdit ? 'Design updated!' : 'Design created!');
      onSuccess(data);
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  }

  const serviceOptions = [
    { value: '', label: 'Select a service...' },
    ...services.map((s) => ({ value: s.id, label: `${s.name} (₹${s.basePrice})` })),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input
            label="Design Name"
            placeholder="e.g. Embroidered Bridal Lehenga"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
          />
        </div>

        <Select
          label="Category"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          options={CATEGORIES.map((c) => ({ value: c, label: c }))}
        />

        <Select
          label="Linked Service"
          value={form.serviceId}
          onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
          options={serviceOptions}
          error={errors.serviceId}
        />

        <Input
          label="Price Override (₹)"
          type="number"
          placeholder="Leave blank to use service price"
          value={form.basePrice}
          onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
          error={errors.basePrice}
        />

        <Input
          label="Tags (comma separated)"
          placeholder="e.g. embroidery, bridal, heavy-work"
          value={form.tags}
          onChange={(e) => setForm({ ...form, tags: e.target.value })}
        />

        <div className="col-span-2">
          <label className="text-sm font-medium text-gray-700 block mb-1">Description</label>
          <textarea
            rows={2}
            placeholder="Brief description of this design..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Image upload */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">
          Design Images <span className="text-gray-400 font-normal">({images.length}/5)</span>
        </label>

        <div className="grid grid-cols-5 gap-2 mb-3">
          {images.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
              <img src={url} alt={`Design ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <FiX className="w-3 h-3" />
              </button>
              {i === 0 && (
                <span className="absolute bottom-0.5 left-0.5 text-[9px] bg-black/50 text-white px-1 rounded">
                  Cover
                </span>
              )}
            </div>
          ))}

          {images.length < 5 && (
            <label className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-all">
              {uploading ? (
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <FiUpload className="w-4 h-4 text-gray-400" />
                  <span className="text-[10px] text-gray-400 mt-1">Add</span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploading}
              />
            </label>
          )}
        </div>

        {errors.images && <p className="text-xs text-red-500">{errors.images}</p>}
        <p className="text-xs text-gray-400">First image is used as cover. JPEG, PNG, WebP. Max 5MB each.</p>
      </div>

      {isEdit && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="w-4 h-4 text-indigo-600 rounded"
          />
          <span className="text-sm text-gray-700">Active (visible to customers)</span>
        </label>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="submit" loading={saving} className="flex-1">
          {isEdit ? 'Update Design' : 'Create Design'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default AdminDesignForm;
