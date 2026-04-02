import React from 'react';
import { cn } from '../../lib/utils';
import {
  FiHome, FiShoppingBag, FiUsers, FiScissors, FiBarChart2,
  FiSettings, FiTag, FiCalendar, FiDollarSign, FiPackage,
  FiTool, FiUser, FiX, FiChevronRight, FiSliders, FiTrendingUp, FiGrid
} from 'react-icons/fi';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  role: 'ADMIN' | 'CUSTOMER' | 'TAILOR';
  currentPath: string;
  isOpen: boolean;
  onClose: () => void;
}

const adminNav: NavItem[] = [
  { href: '/dashboard/admin', label: 'Overview', icon: <FiHome /> },
  { href: '/dashboard/admin/orders', label: 'Orders', icon: <FiShoppingBag /> },
  { href: '/dashboard/admin/users', label: 'Users', icon: <FiUsers /> },
  { href: '/dashboard/admin/measurements', label: 'Measurements', icon: <FiSliders /> },
  { href: '/dashboard/admin/services', label: 'Services', icon: <FiScissors /> },
  { href: '/dashboard/admin/fabrics', label: 'Fabrics', icon: <FiPackage /> },
  { href: '/dashboard/admin/analytics', label: 'Analytics', icon: <FiBarChart2 /> },
  { href: '/dashboard/admin/pnl', label: 'Profit & Loss', icon: <FiTrendingUp /> },
  { href: '/dashboard/admin/finances', label: 'Finances', icon: <FiDollarSign /> },
  { href: '/dashboard/admin/expenses', label: 'Expenses', icon: <FiDollarSign /> },
  { href: '/dashboard/admin/coupons', label: 'Coupons', icon: <FiTag /> },
  { href: '/dashboard/admin/designs', label: 'Design Catalog', icon: <FiGrid /> },
];

const customerNav: NavItem[] = [
  { href: '/dashboard/customer', label: 'Overview', icon: <FiHome /> },
  { href: '/dashboard/customer/orders', label: 'My Orders', icon: <FiShoppingBag /> },
  { href: '/dashboard/customer/measurements', label: 'Measurements', icon: <FiTool /> },
  { href: '/dashboard/customer/appointments', label: 'Appointments', icon: <FiCalendar /> },
  { href: '/dashboard/customer/payments', label: 'Payments & Dues', icon: <FiDollarSign /> },
  { href: '/dashboard/customer/designs', label: 'Design Catalog', icon: <FiGrid /> },
  { href: '/dashboard/customer/profile', label: 'Profile', icon: <FiUser /> },
];

const tailorNav: NavItem[] = [
  { href: '/dashboard/tailor', label: 'Overview', icon: <FiHome /> },
  { href: '/dashboard/tailor/orders', label: 'My Work', icon: <FiShoppingBag /> },
  { href: '/dashboard/tailor/appointments', label: 'Appointments', icon: <FiCalendar /> },
  { href: '/dashboard/tailor/measurements', label: 'Measurements', icon: <FiTool /> },
  { href: '/dashboard/tailor/reviews', label: 'My Reviews', icon: <FiBarChart2 /> },
  { href: '/dashboard/tailor/earnings', label: 'Earnings & Dues', icon: <FiDollarSign /> },
  { href: '/dashboard/tailor/profile', label: 'Profile', icon: <FiUser /> },
];

const navByRole = { ADMIN: adminNav, CUSTOMER: customerNav, TAILOR: tailorNav };

export function Sidebar({ role, currentPath, isOpen, onClose }: SidebarProps) {
  const navItems = navByRole[role];

  const roleLabel = { ADMIN: 'Admin', CUSTOMER: 'Customer', TAILOR: 'Tailor' }[role];
  const roleBadgeColor = { ADMIN: 'bg-indigo-500', CUSTOMER: 'bg-green-500', TAILOR: 'bg-purple-500' }[role];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-20 lg:hidden pointer-events-auto transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'pointer-events-auto fixed top-0 left-0 h-full w-64 bg-slate-900 text-white z-30 flex flex-col transition-transform duration-300',
          'lg:translate-x-0 lg:fixed lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20 flex items-center justify-center text-sm font-bold">
              S
            </div>
            <span className="text-lg font-bold tracking-tight">StitchIt</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-3 py-2 border-b border-slate-700">
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold text-white', roleBadgeColor)}>
            {roleLabel} Portal
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = currentPath === item.href || (item.href !== '/dashboard/' + role.toLowerCase() && currentPath.startsWith(item.href));
            return (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 group',
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <span className="text-sm flex-shrink-0">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {isActive && <FiChevronRight className="w-3 h-3 opacity-70" />}
              </a>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-2 py-2 border-t border-slate-700">
          <a
            href="/"
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <FiSettings className="w-3.5 h-3.5" />
            Back to Home
          </a>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
