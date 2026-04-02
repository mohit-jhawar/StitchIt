import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { OrderStatusBadge, PriorityBadge } from './OrderStatusBadge';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { formatCurrency, formatDateTime, formatDate } from '../../lib/utils';
import { FiCheck, FiClock, FiDollarSign, FiDownload, FiStar, FiAlertCircle, FiUser } from 'react-icons/fi';

interface Measurement {
  name: string;
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

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  priority: string;
  totalAmount: number;
  notes?: string;
  deliveryDate?: string;
  createdAt: string;
  customer?: { name: string; phone?: string };
  tailor?: { id: string; name: string };
  tailorId?: string;
  measurement?: Measurement;
  items: Array<{ id: string; quantity: number; unitPrice: number; notes?: string; service: { name: string; category: string }; fabric?: { name: string; color?: string } }>;
  payments: Array<{ id: string; amount: number; method: string; type: string; paidAt: string; notes?: string }>;
  timeline: Array<{ id: string; status: string; note?: string; createdAt: string }>;
  reviews: Array<{ id: string; rating: number; comment?: string; createdAt: string }>;
  complaints: Array<{ id: string; subject: string; status: string; priority: string; createdAt: string }>;
}

interface Tailor {
  id: string;
  name: string;
  specialization?: string;
}

interface OrderDetailProps {
  orderId: string;
  role: 'ADMIN' | 'CUSTOMER' | 'TAILOR';
}

const ORDER_STATUSES = [
  'PENDING','CONFIRMED','FABRIC_SELECTED','CUTTING','STITCHING',
  'FITTING','ALTERATIONS','QUALITY_CHECK','READY','DELIVERED',
];

export function OrderDetail({ orderId, role }: OrderDetailProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Admin: tailor assignment
  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [selectedTailor, setSelectedTailor] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Admin: payment recording
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [payType, setPayType] = useState('ADVANCE');
  const [payNotes, setPayNotes] = useState('');
  const [recordingPay, setRecordingPay] = useState(false);

  // Customer: review
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Customer: complaint
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [complaintPriority, setComplaintPriority] = useState('MEDIUM');
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [showComplaintForm, setShowComplaintForm] = useState(false);

  useEffect(() => {
    fetchOrder();
    if (role === 'ADMIN') fetchTailors();
  }, [orderId]);

  async function fetchOrder() {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to load order'); return; }
      setOrder(data);
      setNewStatus(data.status);
      setSelectedTailor(data.tailorId || '');
    } catch {
      toast.error('Failed to load order');
    } finally {
      setLoading(false);
    }
  }

  async function fetchTailors() {
    try {
      const res = await fetch('/api/users?role=TAILOR&limit=100');
      if (res.ok) {
        const data = await res.json();
        setTailors((data.users || []).map((u: any) => ({
          id: u.tailorProfile?.id,
          name: u.tailorProfile?.name || u.email,
          specialization: u.tailorProfile?.specialization,
        })).filter((t: Tailor) => t.id));
      }
    } catch {}
  }

  async function handleStatusUpdate() {
    if (!newStatus || newStatus === order?.status) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, note: statusNote }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to update status'); return; }
      toast.success('Order status updated');
      setOrder((prev) => prev ? { ...prev, status: newStatus, timeline: data.timeline } : prev);
      setStatusNote('');
    } catch {
      toast.error('Network error');
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleAssignTailor() {
    if (!selectedTailor) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tailorId: selectedTailor }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Assignment failed'); return; }
      toast.success('Tailor assigned successfully');
      const tailor = tailors.find((t) => t.id === selectedTailor);
      setOrder((prev) => prev ? { ...prev, tailor: tailor ? { id: tailor.id, name: tailor.name } : prev.tailor, tailorId: selectedTailor } : prev);
    } catch {
      toast.error('Network error');
    } finally {
      setAssigning(false);
    }
  }

  async function handleRecordPayment() {
    if (!payAmount || parseFloat(payAmount) <= 0) { toast.error('Enter a valid amount'); return; }
    setRecordingPay(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount: parseFloat(payAmount),
          method: payMethod,
          type: payType,
          notes: payNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Payment failed'); return; }
      toast.success('Payment recorded');
      setPayAmount(''); setPayNotes('');
      await fetchOrder();
    } catch {
      toast.error('Network error');
    } finally {
      setRecordingPay(false);
    }
  }

  async function handleSubmitReview() {
    setSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, rating: reviewRating, comment: reviewComment || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Review failed'); return; }
      toast.success('Review submitted!');
      await fetchOrder();
    } catch {
      toast.error('Network error');
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleSubmitComplaint() {
    if (!complaintSubject.trim() || !complaintDesc.trim()) { toast.error('Subject and description required'); return; }
    setSubmittingComplaint(true);
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, subject: complaintSubject, description: complaintDesc, priority: complaintPriority }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to submit complaint'); return; }
      toast.success('Complaint submitted');
      setComplaintSubject(''); setComplaintDesc(''); setShowComplaintForm(false);
      await fetchOrder();
    } catch {
      toast.error('Network error');
    } finally {
      setSubmittingComplaint(false);
    }
  }

  const paidAmount = order?.payments.reduce((s, p) => s + p.amount, 0) || 0;
  const balanceAmount = (order?.totalAmount || 0) - paidAmount;
  const hasReview = (order?.reviews?.length || 0) > 0;

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  );

  if (!order) return <div className="text-center py-12 text-gray-400">Order not found</div>;

  const measurementFields = [
    { label: 'Chest', value: order.measurement?.chest },
    { label: 'Waist', value: order.measurement?.waist },
    { label: 'Hip', value: order.measurement?.hip },
    { label: 'Shoulder', value: order.measurement?.shoulder },
    { label: 'Sleeve', value: order.measurement?.sleeve },
    { label: 'Length', value: order.measurement?.length },
    { label: 'Inseam', value: order.measurement?.inseam },
    { label: 'Neck', value: order.measurement?.neck },
  ].filter((f) => f.value != null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-mono">{order.orderNumber}</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">Created {formatDateTime(order.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/api/orders/${orderId}/invoice`)}
              className="flex items-center gap-2"
            >
              <FiDownload className="w-4 h-4" /> Invoice
            </Button>
            <OrderStatusBadge status={order.status} />
            <PriorityBadge priority={order.priority} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-50">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Customer</p>
            <p className="text-sm font-medium text-gray-900 mt-1">{order.customer?.name || '-'}</p>
            {order.customer?.phone && <p className="text-xs text-gray-400">{order.customer.phone}</p>}
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Tailor</p>
            <p className="text-sm font-medium text-gray-900 mt-1">{order.tailor?.name || 'Unassigned'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Delivery Date</p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {order.deliveryDate ? formatDate(order.deliveryDate) : 'Not set'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Measurement</p>
            <p className="text-sm font-medium text-gray-900 mt-1">{order.measurement?.name || 'None'}</p>
          </div>
        </div>

        {order.notes && (
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800"><strong>Note:</strong> {order.notes}</p>
          </div>
        )}
      </div>

      {/* Payment summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Amount', value: formatCurrency(order.totalAmount), color: 'text-gray-900' },
          { label: 'Paid', value: formatCurrency(paidAmount), color: 'text-green-600' },
          { label: 'Balance Due', value: formatCurrency(balanceAmount), color: balanceAmount > 0 ? 'text-red-500' : 'text-green-600' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-tight">{item.label}</p>
            <p className={`text-base font-bold mt-0.5 ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Order Items</h3>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.service.name}</p>
                <p className="text-xs text-gray-400">{item.service.category}</p>
                {item.fabric && <p className="text-xs text-indigo-600">Fabric: {item.fabric.name}{item.fabric.color ? ` (${item.fabric.color})` : ''}</p>}
                {item.notes && <p className="text-xs text-gray-500 mt-0.5 italic">{item.notes}</p>}
              </div>
              <div className="text-right ml-4 flex-shrink-0">
                <p className="text-xs text-gray-500">{formatCurrency(item.unitPrice)} × {item.quantity}</p>
                <p className="text-sm font-bold text-indigo-600">{formatCurrency(item.unitPrice * item.quantity)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Measurements detail (tailor and admin) */}
      {(role === 'TAILOR' || role === 'ADMIN') && order.measurement && measurementFields.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Body Measurements — {order.measurement.name}</h3>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {measurementFields.map((f) => (
              <div key={f.label} className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
                <p className="text-base font-bold text-indigo-700 leading-none">{f.value}"</p>
                <p className="text-[9px] text-gray-400 uppercase tracking-tight mt-1">{f.label}</p>
              </div>
            ))}
          </div>
          {order.measurement.notes && (
            <p className="text-xs text-gray-500 mt-3 italic">Note: {order.measurement.notes}</p>
          )}
        </div>
      )}

      {/* Admin: Assign Tailor */}
      {role === 'ADMIN' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FiUser className="w-4 h-4 text-indigo-500" /> Assign Tailor
          </h3>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <select
                value={selectedTailor}
                onChange={(e) => setSelectedTailor(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">— Unassigned —</option>
                {tailors.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.specialization ? ` (${t.specialization})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={handleAssignTailor}
              loading={assigning}
              disabled={!selectedTailor || selectedTailor === order.tailorId}
              size="sm"
            >
              Assign
            </Button>
          </div>
          {order.tailor && (
            <p className="text-xs text-gray-400 mt-2">Currently assigned to: <span className="font-medium text-gray-700">{order.tailor.name}</span></p>
          )}
        </div>
      )}

      {/* Status Update (admin + tailor) */}
      {role !== 'CUSTOMER' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Update Status</h3>
          <div className="space-y-3">
            <Select
              label="New Status"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              options={ORDER_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))}
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Note (optional)</label>
              <input
                type="text"
                placeholder="Add a note about this update..."
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <Button
              onClick={handleStatusUpdate}
              loading={updatingStatus}
              disabled={newStatus === order.status}
            >
              <FiCheck className="w-4 h-4 mr-1" /> Update Status
            </Button>
          </div>
        </div>
      )}

      {/* Admin: Record Payment */}
      {role === 'ADMIN' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FiDollarSign className="w-4 h-4 text-green-500" /> Record Payment
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Amount (₹)</label>
              <input
                type="number"
                min="1"
                placeholder="0"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Type</label>
              <select value={payType} onChange={(e) => setPayType(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="ADVANCE">Advance</option>
                <option value="BALANCE">Balance</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Method</label>
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="UPI">UPI</option>
                <option value="ONLINE">Online</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Notes</label>
              <input
                type="text"
                placeholder="Optional"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="mt-3">
            <Button onClick={handleRecordPayment} loading={recordingPay} disabled={!payAmount || parseFloat(payAmount) <= 0}>
              <FiDollarSign className="w-4 h-4 mr-1" /> Record Payment
            </Button>
          </div>
        </div>
      )}

      {/* Order Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Order Timeline</h3>
        {order.timeline.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No timeline entries yet</p>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-4">
              {order.timeline.map((entry) => (
                <div key={entry.id} className="relative flex items-start gap-4 pl-10">
                  <div className="absolute left-2.5 -translate-x-1/2 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white shadow" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <OrderStatusBadge status={entry.status} />
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <FiClock className="w-3 h-3" />
                        {formatDateTime(entry.createdAt)}
                      </span>
                    </div>
                    {entry.note && <p className="text-sm text-gray-600 mt-1">{entry.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payment History */}
      {order.payments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment History</h3>
          <div className="space-y-2">
            {order.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <span className="text-sm font-medium text-gray-900">{p.type}</span>
                  <span className="text-xs text-gray-400 ml-2 uppercase">{p.method}</span>
                  {p.notes && <p className="text-xs text-gray-400 mt-0.5">{p.notes}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-gray-400">{formatDate(p.paidAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer: Leave a Review (only if DELIVERED and no review yet) */}
      {role === 'CUSTOMER' && order.status === 'DELIVERED' && !hasReview && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FiStar className="w-4 h-4 text-amber-400" /> Leave a Review
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide block mb-2">Rating</label>
              <div className="flex gap-1">
                {[1,2,3,4,5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className={`text-2xl transition-colors ${star <= reviewRating ? 'text-amber-400' : 'text-gray-300'}`}
                  >
                    ★
                  </button>
                ))}
                <span className="text-xs text-gray-400 ml-2 self-center">{reviewRating}/5</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Comment (optional)</label>
              <textarea
                rows={3}
                placeholder="Share your experience..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
            <Button onClick={handleSubmitReview} loading={submittingReview}>
              <FiStar className="w-4 h-4 mr-1" /> Submit Review
            </Button>
          </div>
        </div>
      )}

      {/* Show existing review */}
      {role === 'CUSTOMER' && hasReview && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <FiStar className="w-4 h-4 text-amber-400" /> Your Review
          </h3>
          {order.reviews.map((r) => (
            <div key={r.id}>
              <div className="flex items-center gap-1 mb-1">
                {[1,2,3,4,5].map((s) => (
                  <span key={s} className={`text-lg ${s <= r.rating ? 'text-amber-400' : 'text-gray-300'}`}>★</span>
                ))}
              </div>
              {r.comment && <p className="text-sm text-gray-600 italic">"{r.comment}"</p>}
              <p className="text-xs text-gray-400 mt-1">{formatDate(r.createdAt)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Customer: Existing Complaints */}
      {role === 'CUSTOMER' && order.complaints.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 text-red-400" /> Complaints
          </h3>
          <div className="space-y-2">
            {order.complaints.map((c) => (
              <div key={c.id} className="p-3 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{c.subject}</p>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    c.status === 'RESOLVED' ? 'bg-green-100 text-green-700' :
                    c.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  }`}>{c.status.replace('_', ' ')}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{formatDate(c.createdAt)} · Priority: {c.priority}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer: File Complaint */}
      {role === 'CUSTOMER' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          {!showComplaintForm ? (
            <button
              onClick={() => setShowComplaintForm(true)}
              className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
            >
              <FiAlertCircle className="w-4 h-4" /> File a Complaint
            </button>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <FiAlertCircle className="w-4 h-4 text-red-400" /> File a Complaint
              </h3>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Subject</label>
                <input
                  type="text"
                  placeholder="Brief description of issue"
                  value={complaintSubject}
                  onChange={(e) => setComplaintSubject(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe the issue in detail..."
                  value={complaintDesc}
                  onChange={(e) => setComplaintDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Priority</label>
                <select value={complaintPriority} onChange={(e) => setComplaintPriority(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSubmitComplaint} loading={submittingComplaint} className="bg-red-600 hover:bg-red-700">
                  Submit Complaint
                </Button>
                <Button variant="outline" onClick={() => setShowComplaintForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin: View all complaints */}
      {role === 'ADMIN' && order.complaints.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 text-red-400" /> Complaints ({order.complaints.length})
          </h3>
          <div className="space-y-2">
            {order.complaints.map((c) => (
              <div key={c.id} className="p-3 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{c.subject}</p>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    c.status === 'RESOLVED' ? 'bg-green-100 text-green-700' :
                    c.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  }`}>{c.status.replace('_', ' ')}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Priority: <strong>{c.priority}</strong> · {formatDate(c.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderDetail;
