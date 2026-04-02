import React, { useState, useEffect, useRef } from 'react';
import { FiBell, FiMenu, FiChevronDown, FiLogOut, FiUser } from 'react-icons/fi';
import { toast } from 'sonner';

interface HeaderProps {
  user: { id: string; email: string; role: string; name?: string };
  onToggleSidebar: () => void;
  title?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function Header({ user, onToggleSidebar, title }: HeaderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {}
  }

  async function markAsRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success('Logged out successfully');
      window.location.href = '/login';
    } catch {
      toast.error('Logout failed');
    }
  }

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-indigo-100 text-indigo-700',
    CUSTOMER: 'bg-green-100 text-green-700',
    TAILOR: 'bg-purple-100 text-purple-700',
  };

  const initials = (user.name || user.email).charAt(0).toUpperCase();

  return (
    <div className="h-full flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3 lg:w-1/3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 -ml-1 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <FiMenu className="w-5 h-5" />
        </button>
        {title && (
          <h1 className="text-sm font-semibold text-gray-900 hidden lg:block truncate">{title}</h1>
        )}
      </div>

      {title && (
        <div className="absolute left-1/2 -translate-x-1/2 lg:hidden">
          <h1 className="text-sm font-bold text-gray-900 truncate max-w-[150px]">{title}</h1>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 lg:gap-4 lg:w-1/3">
        {/* Notifications */}
        <div className="relative" ref={notifsRef}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <FiBell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-red-500 text-white rounded-full flex items-center justify-center font-bold" style={{ fontSize: '9px' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-10 w-76 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                <span className="text-xs text-gray-500">{unreadCount} unread</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">No notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.isRead && markAsRead(n.id)}
                      className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-indigo-50/50' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.isRead && (
                          <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0" />
                        )}
                        <div className={!n.isRead ? '' : 'pl-4'}>
                          <p className="text-sm font-medium text-gray-900">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-gray-900 leading-none">
                {user.name || user.email.split('@')[0]}
              </p>
              <span className={`text-xs px-1 py-0.5 rounded-full font-medium ${roleColors[user.role] || 'bg-gray-100 text-gray-600'}`} style={{ fontSize: '10px' }}>
                {user.role}
              </span>
            </div>
            <FiChevronDown className="w-3 h-3 text-gray-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-10 w-44 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-1 overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{user.name || user.email}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <a
                href={`/dashboard/${user.role.toLowerCase()}/profile`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <FiUser className="w-4 h-4" /> Profile
              </a>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                <FiLogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Header;
