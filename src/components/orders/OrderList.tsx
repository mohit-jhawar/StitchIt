import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { OrderStatusBadge, PriorityBadge } from './OrderStatusBadge';
import { Pagination } from '../ui/Pagination';
import { formatCurrency, formatDate } from '../../lib/utils';
import { FiSearch, FiFilter, FiEye, FiEdit2, FiPlus } from 'react-icons/fi';
import { Modal } from '../ui/Modal';
import { OrderForm } from './OrderForm';
import { Button } from '../ui/Button';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  priority: string;
  totalAmount: number;
  deliveryDate?: string;
  createdAt: string;
  customer?: { name: string };
  tailor?: { name: string };
  savedByName?: string;
  savedByRole?: string;
  items: any[];
}

interface OrderListProps {
  role: 'ADMIN' | 'CUSTOMER' | 'TAILOR';
}

const STATUS_OPTIONS = [
  'PENDING', 'CONFIRMED', 'FABRIC_SELECTED', 'CUTTING', 'STITCHING',
  'FITTING', 'ALTERATIONS', 'QUALITY_CHECK', 'READY', 'DELIVERED',
];

export function OrderList({ role }: OrderListProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [page, search, statusFilter]);

  async function fetchOrders() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/orders?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setOrders(data.orders);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setStatusFilter(e.target.value);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
          <input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="relative">
          <FiFilter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
          <select
            value={statusFilter}
            onChange={handleStatusChange}
            className="pl-8 pr-7 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{total} Orders</div>
        {(role === 'TAILOR' || role === 'ADMIN') && (
          <Button onClick={() => setShowForm(true)} size="sm" className="h-8 text-[11px] px-3 shadow-md bg-indigo-600 hover:bg-indigo-700 border-none">
            <FiPlus className="w-3.5 h-3.5 mr-1" /> New Order
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-[10px] text-gray-400 mt-2">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <FiSearch className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-sm">No orders found</p>
          </div>
        ) : (
          <div className="relative group/scroll">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2.5 font-bold text-gray-900 border-b border-gray-100 text-[10px] uppercase tracking-wider">Order #</th>
                    {role === 'ADMIN' && <th className="px-4 py-2.5 font-bold text-gray-900 border-b border-gray-100 text-[10px] uppercase tracking-wider">Stakeholders</th>}
                    <th className="px-4 py-2.5 font-bold text-gray-900 border-b border-gray-100 text-[10px] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2.5 font-bold text-gray-900 border-b border-gray-100 text-[10px] uppercase tracking-wider text-right">Amount</th>
                    <th className="px-4 py-2.5 font-bold text-gray-900 border-b border-gray-100 text-[10px] uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-4 py-3 align-top">
                        <span className="font-mono font-bold text-indigo-600 text-xs block">{order.orderNumber}</span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">{formatDate(order.createdAt)}</span>
                        
                        {/* Attribution Badge */}
                        {order.savedByName && (
                          <div className="mt-1.5">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                              order.savedByRole === 'TAILOR' 
                                ? 'bg-purple-100 text-purple-700' 
                                : order.savedByRole === 'ADMIN' 
                                ? 'bg-indigo-100 text-indigo-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {order.savedByRole === 'TAILOR' ? '🪡 ' : order.savedByRole === 'ADMIN' ? '🛡️ ' : '👤 '}
                              {order.savedByName}
                            </span>
                          </div>
                        )}
                      </td>
                      {role === 'ADMIN' && (
                        <td className="px-4 py-3 align-top">
                          <p className="text-xs font-semibold text-gray-900">{order.customer?.name}</p>
                          <p className="text-[10px] text-gray-400">{order.tailor?.name || 'Unassigned'}</p>
                        </td>
                      )}
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-1">
                          <OrderStatusBadge status={order.status} />
                          <PriorityBadge priority={order.priority} />
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        <span className="text-xs font-bold text-gray-900 block">{formatCurrency(order.totalAmount)}</span>
                        {order.deliveryDate && <span className="text-[9px] text-gray-400 block mt-0.5">Due: {formatDate(order.deliveryDate)}</span>}
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        <a
                          href={`/dashboard/${role.toLowerCase()}/orders/${order.id}`}
                          className="inline-flex p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <FiEye className="w-4 h-4" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile horizontal scroll indicator */}
            <div className="lg:hidden absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-white/80 to-transparent pointer-events-none opacity-0 group-hover/scroll:opacity-100 transition-opacity" />
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Create New Order" size="xl">
        <OrderForm role={role} onSuccess={() => { setShowForm(false); fetchOrders(); }} />
      </Modal>
    </div>
  );
}

export default OrderList;
