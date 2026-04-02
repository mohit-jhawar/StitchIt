import React, { useEffect, useState } from 'react';
import { withErrorBoundary } from '../ui/ErrorBoundary';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#9ca3af',
  CONFIRMED: '#3b82f6',
  FABRIC_SELECTED: '#06b6d4',
  CUTTING: '#eab308',
  STITCHING: '#f97316',
  FITTING: '#a855f7',
  ALTERATIONS: '#ec4899',
  QUALITY_CHECK: '#6366f1',
  READY: '#22c55e',
  DELIVERED: '#10b981',
};

export function OrderStatusChart() {
  const [statusData, setStatusData] = useState<Array<{ status: string; _count: { status: number } }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/dashboard')
      .then((r) => r.json())
      .then((d) => setStatusData(d.ordersByStatus || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="h-4 bg-gray-200 rounded w-32 mb-3 animate-pulse" />
      <div className="h-48 bg-gray-100 rounded animate-pulse" />
    </div>
  );

  if (statusData.length === 0) return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Orders by Status</h3>
      <div className="h-48 flex items-center justify-center text-gray-400 text-xs">
        No order data yet
      </div>
    </div>
  );

  const chartData = {
    labels: statusData.map((d) => d.status.replace(/_/g, ' ')),
    datasets: [
      {
        data: statusData.map((d) => d._count.status),
        backgroundColor: statusData.map((d) => STATUS_COLORS[d.status] || '#9ca3af'),
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { font: { size: 11 }, padding: 12 },
      },
    },
    cutout: '60%',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Orders by Status</h3>
      <div className="max-w-xs mx-auto">
        <Doughnut data={chartData} options={options} />
      </div>
    </div>
  );
}

export default withErrorBoundary(OrderStatusChart, 'Order Status Chart', 'inline');
