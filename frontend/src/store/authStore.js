import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../services/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await authApi.login({ email, password });
          // Backend returns: { access_token, token_type, expires_in, user }
          localStorage.setItem('bhavvi_access_token', data.access_token);
          set({
            user: data.user,
            token: data.access_token,
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          const resp = err.response?.data;
          // Structured error: { code, message } or legacy { detail }
          const code = resp?.code || null;
          const message = resp?.message || resp?.detail || 'Login failed.';
          return { success: false, code, error: message };
        }
      },

      register: async (fullName, username, email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await authApi.register({
            full_name: fullName,
            username,
            email,
            password,
          });
          set({ isLoading: false });
          // Registration sends a verification email — don't auto-login
          return { success: true, message: data.message, email_sent_to: data.email_sent_to };
        } catch (err) {
          set({ isLoading: false });
          return {
            success: false,
            error: err.response?.data?.detail || err.response?.data?.error?.message || 'Registration failed.',
          };
        }
      },

      logout: () => {
        localStorage.removeItem('bhavvi_access_token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      refreshUser: async () => {
        try {
          const { data } = await authApi.me();
          set({ user: data });
        } catch {
          get().logout();
        }
      },
    }),
    {
      name: 'bhavvi-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
