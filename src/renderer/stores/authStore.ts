import { create } from 'zustand';
import type { User, UserRole } from '@shared/types';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkPermission: (requiredRole: UserRole) => boolean;
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  operator: 0,
  engineer: 1,
  admin: 2,
};

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (username: string, password: string) => {
    set({ isLoading: true });
    try {
      const result = await window.electronAPI.auth.login(username, password);
      if ('error' in result) {
        set({ isLoading: false });
        return { success: false, error: result.error };
      }
      set({
        currentUser: result,
        isAuthenticated: true,
        isLoading: false,
      });
      return { success: true };
    } catch {
      set({ isLoading: false });
      return { success: false, error: '登录失败，请检查服务连接' };
    }
  },

  logout: () => {
    set({
      currentUser: null,
      isAuthenticated: false,
    });
  },

  checkPermission: (requiredRole: UserRole) => {
    const { currentUser } = get();
    if (!currentUser) return false;
    return ROLE_HIERARCHY[currentUser.role] >= ROLE_HIERARCHY[requiredRole];
  },
}));