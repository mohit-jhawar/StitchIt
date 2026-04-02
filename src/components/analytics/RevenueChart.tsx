import React, { useEffect, useState } from 'react';
import { withErrorBoundary } from '../ui/ErrorBoundary';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { formatCurrency } from '../../lib/utils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

interface DayRevenue {
  date: string;
  revenue: number;
}

export function RevenueChart() {
  const [data, setData] = useState<DayRevenue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/dashboard')
      .then((r) => r.json())
      .then((d) => setData(d.last7DaysRevenue || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="h-4 bg-gray-200 rounded w-32 mb-3 animate-pulse" />
      <div className="h-48 bg-gray-100 rounded animate-pulse" />
    </div>
  );

  const labels = data.map((d) => {
    const date = new Date(d.date);
    return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Revenue',
        data: data.map((d) => d.revenue),
        fill: true,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(99, 102, 241, 1)',
        pointRadius: 4,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => formatCurrency(ctx.raw),
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (v: any) => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v),
        },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
      x: {
        grid: { display: false },
      },
    },
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Revenue — Last 7 Days</h3>
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-xs">
          No revenue data yet
        </div>
      ) : (
        <div className="h-48">
          <Line data={chartData} options={{ ...options, maintainAspectRatio: false } as any} />
        </div>
      )}
    </div>
  );
}

export default withErrorBoundary(RevenueChart, 'Revenue Chart', 'inline');
