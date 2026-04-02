import React from 'react';
import { getOrderStatusColor, getPriorityColor } from '../../lib/utils';

interface OrderStatusBadgeProps {
  status: string;
}

interface PriorityBadgeProps {
  priority: string;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  FABRIC_SELECTED: 'Fabric Selected',
  CUTTING: 'Cutting',
  STITCHING: 'Stitching',
  FITTING: 'Fitting',
  ALTERATIONS: 'Alterations',
  QUALITY_CHECK: 'Quality Check',
  READY: 'Ready',
  DELIVERED: 'Delivered',
};

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOrderStatusColor(status)}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(priority)}`}>
      {priority}
    </span>
  );
}

export default OrderStatusBadge;
