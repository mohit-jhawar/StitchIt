import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { MeasurementForm } from './MeasurementForm';
import { formatDate } from '../../lib/utils';
import { FiPlus, FiEdit2, FiTrash2, FiSliders, FiUser, FiScissors, FiShield } from 'react-icons/fi';

interface Measurement {
  id: string;
  name: string;
  chest?: number;
  waist?: number;
  hip?: number;
  shoulder?: number;
  sleeve?: number;
  length?: number;
  notes?: string;
  createdAt: string;
  savedByName?: string;
  savedByRole?: string;
}

export function MeasurementList({ role = 'CUSTOMER' }: { role?: 'CUSTOMER' | 'TAILOR' | 'ADMIN' }) {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Measurement | null>(null);

  useEffect(() => { fetchMeasurements(); }, []);

  async function fetchMeasurements() {
    try {
      const res = await fetch('/api/measurements');
      if (res.ok) setMeasurements(await res.json());
    } catch {
      toast.error('Failed to load measurements');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this measurement?')) return;
    try {
      await fetch(`/api/measurements/${id}`, { method: 'DELETE' });
      toast.success('Deleted');
      setMeasurements((m) => m.filter((x) => x.id !== id));
    } catch {
      toast.error('Delete failed');
    }
  }

  function handleSuccess() {
    setShowForm(false);
    setEditItem(null);
    fetchMeasurements();
  }

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Action Bar (Removed internal title to avoid redundancy with page title) */}
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)} size="sm" className="h-8 text-[11px] px-3 shadow-md bg-purple-600 hover:bg-purple-700 border-none shadow-sm">
          <FiPlus className="w-3.5 h-3.5 mr-1" /> Add Measurement
        </Button>
      </div>

      {measurements.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FiSliders className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="font-medium text-gray-900">No measurements yet</h3>
          <p className="text-gray-500 text-sm mt-1">Add your measurements for better fitting</p>
          <Button onClick={() => setShowForm(true)} className="mt-4">
            <FiPlus className="w-4 h-4" /> Add Measurement
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {measurements.map((m) => (
            <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all group flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm truncate">{m.name}</h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(m.createdAt)}</p>
                    
                    {/* Saved by badge */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {m.savedByName ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          m.savedByRole === 'TAILOR'
                            ? 'bg-purple-100 text-purple-700'
                            : m.savedByRole === 'ADMIN'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {m.savedByRole === 'TAILOR' ? (
                            <FiScissors className="w-2.5 h-2.5" />
                          ) : m.savedByRole === 'ADMIN' ? (
                            <FiShield className="w-2.5 h-2.5" />
                          ) : (
                            <FiUser className="w-2.5 h-2.5" />
                          )}
                          {m.savedByName}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700">
                          <FiUser className="w-2.5 h-2.5" /> Self
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setEditItem(m); setShowForm(true); }} 
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(m.id)} 
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Chest', value: m.chest },
                    { label: 'Waist', value: m.waist },
                    { label: 'Hip', value: m.hip },
                    { label: 'Shoulder', value: m.shoulder },
                    { label: 'Sleeve', value: m.sleeve },
                    { label: 'Length', value: m.length },
                  ].map((item) => item.value != null && (
                    <div key={item.label} className="bg-gray-50/80 rounded-lg p-2 text-center border border-gray-100">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{item.label}</p>
                      <p className="text-xs font-bold text-gray-900 mt-0.5">{item.value}"</p>
                    </div>
                  ))}
                </div>
              </div>
              
              {m.notes && (
                <p className="text-[10px] text-gray-500 mt-4 bg-amber-50/50 p-2 rounded-lg italic line-clamp-2 border border-amber-100/50">
                  {m.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditItem(null); }}
        title={editItem ? 'Edit Measurement' : 'Add Measurement'}
        size="lg"
      >
        <MeasurementForm role={role} measurement={editItem} onSuccess={handleSuccess} />
      </Modal>
    </div>
  );
}

export default MeasurementList;
