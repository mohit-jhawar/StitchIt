import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { AppointmentForm } from './AppointmentForm';
import { formatDateTime } from '../../lib/utils';
import { FiPlus, FiCalendar, FiCheck, FiX } from 'react-icons/fi';

interface Appointment {
  id: string;
  type: string;
  status: string;
  scheduledAt: string;
  notes?: string;
  customer?: { name: string };
  tailor?: { name: string };
  bookedByName?: string;
  bookedByRole?: string;
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-gray-100 text-gray-700',
};

export function AppointmentList({ role }: { role: 'ADMIN' | 'CUSTOMER' | 'TAILOR' }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchAppointments(); }, []);

  async function fetchAppointments() {
    try {
      const res = await fetch('/api/appointments');
      if (res.ok) setAppointments(await res.json());
    } catch {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success('Status updated');
        setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
      }
    } catch {
      toast.error('Update failed');
    }
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
        {(role === 'CUSTOMER' || role === 'TAILOR' || role === 'ADMIN') && (
          <Button onClick={() => setShowForm(true)} size="sm" className="h-8 text-[11px] px-3 shadow-md bg-indigo-600 hover:bg-indigo-700">
            <FiPlus className="w-3.5 h-3.5 mr-1" /> Book Appointment
          </Button>
        )}
      </div>

      {appointments.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FiCalendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="font-medium text-gray-900">No appointments</h3>
          {role === 'CUSTOMER' && (
            <Button onClick={() => setShowForm(true)} className="mt-4">Book Appointment</Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <div key={apt.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 flex-shrink-0">
                  <FiCalendar className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-sm truncate">{apt.type.replace(/_/g, ' ')}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_COLORS[apt.status] || 'bg-gray-100 text-gray-700'}`}>
                      {apt.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium mt-1">{formatDateTime(apt.scheduledAt)}</p>
                  
                  {/* Attribution Badge */}
                  {apt.bookedByName && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        apt.bookedByRole === 'TAILOR' 
                          ? 'bg-purple-100 text-purple-700' 
                          : apt.bookedByRole === 'ADMIN' 
                          ? 'bg-indigo-100 text-indigo-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {apt.bookedByRole === 'TAILOR' ? '🪡 ' : apt.bookedByRole === 'ADMIN' ? '🛡️ ' : '👤 '}
                        Recorded by {apt.bookedByName}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {apt.customer && <p className="text-[10px] text-gray-400 flex items-center gap-1">👤 <span className="truncate max-w-[100px]">{apt.customer.name}</span></p>}
                    {apt.tailor && <p className="text-[10px] text-gray-400 flex items-center gap-1">🪡 <span className="truncate max-w-[100px]">{apt.tailor.name}</span></p>}
                  </div>
                  {apt.notes && <p className="text-[10px] text-gray-500 mt-2 bg-gray-50 p-2 rounded-lg italic line-clamp-2">{apt.notes}</p>}
                </div>
              </div>
              {role !== 'CUSTOMER' && apt.status === 'SCHEDULED' && (
                <div className="flex sm:flex-col gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-gray-100 items-center justify-end">
                  <button
                    onClick={() => updateStatus(apt.id, 'COMPLETED')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 text-[10px] font-bold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors w-full"
                  >
                    <FiCheck className="w-3 h-3" /> Done
                  </button>
                  <button
                    onClick={() => updateStatus(apt.id, 'CANCELLED')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 text-[10px] font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors w-full"
                  >
                    <FiX className="w-3 h-3" /> Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Book Appointment" size="md">
        <AppointmentForm role={role} onSuccess={() => { setShowForm(false); fetchAppointments(); }} />
      </Modal>
    </div>
  );
}

export default AppointmentList;
