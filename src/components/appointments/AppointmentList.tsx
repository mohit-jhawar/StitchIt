import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { AppointmentForm } from './AppointmentForm';
import { formatDateTime } from '../../lib/utils';
import { FiPlus, FiCalendar, FiCheck, FiX, FiThumbsUp, FiThumbsDown } from 'react-icons/fi';

interface Appointment {
  id: string;
  type: string;
  status: string;
  scheduledAt: string;
  notes?: string;
  customer?: { name: string };
  tailor?: { name: string } | null;
  tailorId?: string | null;
  bookedByName?: string;
  bookedByRole?: string;
  isOpenRequest?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  REJECTED:  'bg-orange-100 text-orange-700',
  NO_SHOW:   'bg-gray-100 text-gray-700',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING:   'Pending Approval',
  SCHEDULED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REJECTED:  'Rejected',
  NO_SHOW:   'No Show',
};

export function AppointmentList({ role, myTailorId }: { role: 'ADMIN' | 'CUSTOMER' | 'TAILOR'; myTailorId?: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

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
    setUpdating(id + status);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const labels: Record<string, string> = {
          SCHEDULED: 'Appointment approved',
          REJECTED:  'Appointment rejected',
          COMPLETED: 'Marked as completed',
          CANCELLED: 'Appointment cancelled',
        };
        toast.success(labels[status] || 'Status updated');
        setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
      } else {
        const data = await res.json();
        toast.error(data.error || 'Update failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setUpdating(null);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  );

  const pendingCount = appointments.filter((a) => a.status === 'PENDING').length;

  // For tailor view: open request confirmed by another tailor (read-only)
  const isTakenByOther = (apt: Appointment) =>
    role === 'TAILOR' &&
    apt.isOpenRequest &&
    apt.status === 'SCHEDULED' &&
    myTailorId != null &&
    apt.tailorId !== myTailorId;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {role === 'TAILOR' && pendingCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            {pendingCount} pending request{pendingCount !== 1 ? 's' : ''}
          </span>
        ) : <span />}
        <Button onClick={() => setShowForm(true)} size="sm" className="h-8 text-[11px] px-3 shadow-md bg-indigo-600 hover:bg-indigo-700">
          <FiPlus className="w-3.5 h-3.5 mr-1" />
          {role === 'CUSTOMER' ? 'Request Appointment' : 'Book Appointment'}
        </Button>
      </div>

      {appointments.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FiCalendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="font-medium text-gray-900">No appointments yet</h3>
          <p className="text-sm text-gray-500 mt-1">
            {role === 'CUSTOMER'
              ? 'Request an appointment and a tailor will confirm it.'
              : 'Appointment requests from customers will appear here.'}
          </p>
          {role === 'CUSTOMER' && (
            <Button onClick={() => setShowForm(true)} className="mt-4">Request Appointment</Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <div
              key={apt.id}
              className={`bg-white rounded-xl border p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:shadow-sm transition-shadow ${
                apt.status === 'PENDING' ? 'border-yellow-200 bg-yellow-50/30'
                : isTakenByOther(apt)  ? 'border-gray-200 opacity-60'
                : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 flex-shrink-0">
                  <FiCalendar className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-sm truncate capitalize">
                      {apt.type.replace(/_/g, ' ').toLowerCase()}
                    </h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_COLORS[apt.status] || 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABELS[apt.status] || apt.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium mt-1">{formatDateTime(apt.scheduledAt)}</p>

                  {apt.isOpenRequest && apt.status === 'PENDING' && (
                    <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
                      🌐 Open to any tailor
                    </span>
                  )}
                  {isTakenByOther(apt) && (
                    <p className="text-[10px] text-gray-500 mt-1 font-medium">
                      ✅ Confirmed with <span className="font-bold text-gray-700">{apt.tailor?.name}</span>
                    </p>
                  )}
                  {apt.bookedByName && (
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        apt.bookedByRole === 'TAILOR'
                          ? 'bg-purple-100 text-purple-700'
                          : apt.bookedByRole === 'ADMIN'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {apt.bookedByRole === 'TAILOR' ? '🪡 ' : apt.bookedByRole === 'ADMIN' ? '🛡️ ' : '👤 '}
                        {apt.bookedByRole === 'CUSTOMER' ? 'Requested by' : 'Booked by'} {apt.bookedByName}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {apt.customer && <p className="text-[10px] text-gray-400 flex items-center gap-1">👤 <span className="truncate max-w-[100px]">{apt.customer.name}</span></p>}
                    {apt.tailor   && <p className="text-[10px] text-gray-400 flex items-center gap-1">🪡 <span className="truncate max-w-[100px]">{apt.tailor.name}</span></p>}
                  </div>
                  {apt.notes && <p className="text-[10px] text-gray-500 mt-2 bg-gray-50 p-2 rounded-lg italic line-clamp-2">{apt.notes}</p>}
                </div>
              </div>

              {/* Action buttons — hidden for open requests confirmed by another tailor */}
              {!isTakenByOther(apt) && (
              <div className="flex sm:flex-col gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-gray-100 items-center justify-end shrink-0">

                {/* Tailor: Approve or Reject pending requests */}
                {role === 'TAILOR' && apt.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => updateStatus(apt.id, 'SCHEDULED')}
                      disabled={updating !== null}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors w-full disabled:opacity-50"
                    >
                      <FiThumbsUp className="w-3 h-3" /> Approve
                    </button>
                    <button
                      onClick={() => updateStatus(apt.id, 'REJECTED')}
                      disabled={updating !== null}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors w-full disabled:opacity-50"
                    >
                      <FiThumbsDown className="w-3 h-3" /> Reject
                    </button>
                  </>
                )}

                {/* Tailor: Mark confirmed appointments done or cancel */}
                {role === 'TAILOR' && apt.status === 'SCHEDULED' && (
                  <>
                    <button
                      onClick={() => updateStatus(apt.id, 'COMPLETED')}
                      disabled={updating !== null}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors w-full disabled:opacity-50"
                    >
                      <FiCheck className="w-3 h-3" /> Done
                    </button>
                    <button
                      onClick={() => updateStatus(apt.id, 'CANCELLED')}
                      disabled={updating !== null}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors w-full disabled:opacity-50"
                    >
                      <FiX className="w-3 h-3" /> Cancel
                    </button>
                  </>
                )}

                {/* Customer: Cancel their own pending or confirmed appointments */}
                {role === 'CUSTOMER' && (apt.status === 'PENDING' || apt.status === 'SCHEDULED') && (
                  <button
                    onClick={() => updateStatus(apt.id, 'CANCELLED')}
                    disabled={updating !== null}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <FiX className="w-3 h-3" /> Cancel
                  </button>
                )}

                {/* Admin: Full control */}
                {role === 'ADMIN' && apt.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => updateStatus(apt.id, 'SCHEDULED')}
                      disabled={updating !== null}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors w-full disabled:opacity-50"
                    >
                      <FiThumbsUp className="w-3 h-3" /> Approve
                    </button>
                    <button
                      onClick={() => updateStatus(apt.id, 'REJECTED')}
                      disabled={updating !== null}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors w-full disabled:opacity-50"
                    >
                      <FiThumbsDown className="w-3 h-3" /> Reject
                    </button>
                  </>
                )}
                {role === 'ADMIN' && apt.status === 'SCHEDULED' && (
                  <>
                    <button
                      onClick={() => updateStatus(apt.id, 'COMPLETED')}
                      disabled={updating !== null}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors w-full disabled:opacity-50"
                    >
                      <FiCheck className="w-3 h-3" /> Done
                    </button>
                    <button
                      onClick={() => updateStatus(apt.id, 'CANCELLED')}
                      disabled={updating !== null}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors w-full disabled:opacity-50"
                    >
                      <FiX className="w-3 h-3" /> Cancel
                    </button>
                  </>
                )}

              </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={role === 'CUSTOMER' ? 'Request Appointment' : 'Book Appointment'}
        size="md"
      >
        <AppointmentForm role={role} onSuccess={() => { setShowForm(false); fetchAppointments(); }} />
      </Modal>
    </div>
  );
}

export default AppointmentList;
