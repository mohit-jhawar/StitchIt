import React, { useEffect, useState } from 'react';
import { formatCurrency } from '../../lib/utils';
import { FiShoppingBag, FiUsers, FiDollarSign, FiClock, FiTrendingUp, FiScissors } from 'react-icons/fi';
import { withErrorBoundary } from '../ui/ErrorBoundary';

interface Stats {
  ordersToday: number;
  ordersThisMonth: number;
  pendingOrders: number;
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  totalTailors: number;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  change?: string;
}

function StatCard({ label, value, icon, color, bgColor, change }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3.5 hover:shadow-md transition-all group">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 ${bgColor} rounded-lg flex items-center justify-center ${color} flex-shrink-0 transition-transform group-hover:scale-110`}>
          {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-4 h-4' })}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">{label}</p>
          <p className="text-lg font-bold text-gray-900 leading-tight truncate">{value}</p>
          {change && <p className="text-[9px] text-green-600 font-bold mt-0.5">{change}</p>}
        </div>
      </div>
    </div>
  );
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/dashboard')
      .then((r) => r.json())
      .then((data) => setStats(data.stats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
          <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
          <div className="h-6 bg-gray-200 rounded w-16" />
        </div>
      ))}
    </div>
  );

  if (!stats) return null;

  const cards = [
    { label: 'Orders Today', value: stats.ordersToday, icon: <FiShoppingBag className="w-6 h-6" />, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
    { label: 'This Month', value: stats.ordersThisMonth, icon: <FiTrendingUp className="w-6 h-6" />, color: 'text-purple-600', bgColor: 'bg-purple-100' },
    { label: 'Pending Orders', value: stats.pendingOrders, icon: <FiClock className="w-6 h-6" />, color: 'text-amber-600', bgColor: 'bg-amber-100' },
    { label: 'Total Orders', value: stats.totalOrders, icon: <FiShoppingBag className="w-6 h-6" />, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: <FiDollarSign className="w-6 h-6" />, color: 'text-green-600', bgColor: 'bg-green-100' },
    { label: 'Customers', value: stats.totalCustomers, icon: <FiUsers className="w-6 h-6" />, color: 'text-teal-600', bgColor: 'bg-teal-100' },
    { label: 'Tailors', value: stats.totalTailors, icon: <FiScissors className="w-6 h-6" />, color: 'text-pink-600', bgColor: 'bg-pink-100' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => <StatCard key={card.label} {...card} />)}
    </div>
  );
}

export default withErrorBoundary(DashboardStats, 'Dashboard Stats', 'page');
