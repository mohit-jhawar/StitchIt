import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'CUSTOMER' | 'TAILOR';
  name?: string;
}

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
