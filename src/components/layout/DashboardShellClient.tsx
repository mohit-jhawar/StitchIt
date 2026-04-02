import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ErrorBoundary } from '../ui/ErrorBoundary';

interface Props {
  user: { id: string; email: string; role: 'ADMIN' | 'CUSTOMER' | 'TAILOR'; name?: string };
  currentPath: string;
  pageTitle: string;
}

export function DashboardShellClient({ user, currentPath, pageTitle }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Open sidebar by default on desktop
  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setSidebarOpen(true);
    }
  }, []);

  function toggleSidebar() {
    setSidebarOpen((prev) => !prev);
  }

  return (
    // pointer-events:none so the overlay doesn't swallow clicks in the main content area
    <div style={{ pointerEvents: 'none', position: 'fixed', inset: 0, zIndex: 30 }}>
      {/* Fixed sidebar */}
      <ErrorBoundary label="Sidebar">
        <Sidebar
          role={user.role}
          currentPath={currentPath}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </ErrorBoundary>

      {/* Fixed header — re-enable pointer events only here */}
      <div
        className="pointer-events-auto fixed top-0 right-0 left-0 lg:left-64 z-20 h-14 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm transition-all duration-300"
      >
        <ErrorBoundary label="Header">
          <Header
            user={user}
            title={pageTitle}
            onToggleSidebar={toggleSidebar}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default DashboardShellClient;
