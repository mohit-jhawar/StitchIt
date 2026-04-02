import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { DesignCatalog } from './DesignCatalog';
import { AdminDesignForm } from './AdminDesignForm';
import { Modal } from '../ui/Modal';
import type { Design } from './DesignCard';
import { FiPlus } from 'react-icons/fi';

export function AdminDesignsManager() {
  const [showForm, setShowForm] = useState(false);
  const [editingDesign, setEditingDesign] = useState<Design | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleSuccess(design: Design) {
    setShowForm(false);
    setEditingDesign(null);
    setRefreshKey((k) => k + 1);
  }

  function openCreate() {
    setEditingDesign(null);
    setShowForm(true);
  }

  function openEdit(design: Design) {
    setEditingDesign(design);
    setShowForm(true);
  }

  async function handleDeactivate(design: Design) {
    if (!confirm(`Deactivate "${design.name}"? It will be hidden from customers.`)) return;
    try {
      const res = await fetch(`/api/designs/${design.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Design deactivated');
        setRefreshKey((k) => k + 1);
      } else {
        toast.error('Failed to deactivate');
      }
    } catch {
      toast.error('Network error');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Design Catalog</h1>
          <p className="text-sm text-gray-500 mt-1">Manage designs shown to customers during ordering</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <FiPlus className="w-4 h-4" />
          Add Design
        </button>
      </div>

      <DesignCatalog
        key={refreshKey}
        adminMode
        onSelect={openEdit}
      />

      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingDesign(null); }}
        title={editingDesign ? 'Edit Design' : 'New Design'}
        size="xl"
      >
        <AdminDesignForm
          design={editingDesign}
          onSuccess={handleSuccess}
          onCancel={() => { setShowForm(false); setEditingDesign(null); }}
        />
      </Modal>
    </div>
  );
}

export default AdminDesignsManager;
