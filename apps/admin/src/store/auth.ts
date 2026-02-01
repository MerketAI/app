import { create } from 'zustand';
import { authApi } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    const { accessToken, refreshToken, user } = response.data;

    // Check if user is admin
    if (user.role !== 'ADMIN') {
      throw new Error('Access denied. Admin privileges required.');
    }

    localStorage.setItem('adminAccessToken', accessToken);
    localStorage.setItem('adminRefreshToken', refreshToken);

    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    authApi.logout();
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('adminAccessToken');
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const response = await authApi.me();
      const user = response.data;

      // Check if user is admin
      if (user.role !== 'ADMIN') {
        authApi.logout();
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      authApi.logout();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
