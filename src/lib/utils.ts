import { format } from 'date-fns';

export function generateOrderNumber(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'ORDER-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), 'dd MMM yyyy');
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), 'dd MMM yyyy, hh:mm a');
}

export function paginate(
  page: number = 1,
  limit: number = 10
): { skip: number; take: number } {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  return {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-700',
    CONFIRMED: 'bg-blue-100 text-blue-700',
    FABRIC_SELECTED: 'bg-cyan-100 text-cyan-700',
    CUTTING: 'bg-yellow-100 text-yellow-700',
    STITCHING: 'bg-orange-100 text-orange-700',
    FITTING: 'bg-purple-100 text-purple-700',
    ALTERATIONS: 'bg-pink-100 text-pink-700',
    QUALITY_CHECK: 'bg-indigo-100 text-indigo-700',
    READY: 'bg-green-100 text-green-700',
    DELIVERED: 'bg-emerald-100 text-emerald-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    NORMAL: 'bg-gray-100 text-gray-700',
    URGENT: 'bg-amber-100 text-amber-700',
    EXPRESS: 'bg-red-100 text-red-700',
  };
  return colors[priority] || 'bg-gray-100 text-gray-700';
}

export function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status: number = 400): Response {
  return jsonResponse({ error: message }, status);
}
