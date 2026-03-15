import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      // Actions
      login: async (credentials) => {
        set({ loading: true, error: null });
        
        try {
          const response = await api.post('/auth/login', credentials);
          const { token, user } = response.data.data;
          
          // Set token in axios defaults
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          set({
            user,
            token,
            isAuthenticated: true,
            loading: false,
            error: null,
          });
          
          return { success: true };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Login failed';
          set({
            loading: false,
            error: errorMessage,
          });
          
          return { success: false, error: errorMessage };
        }
      },

      register: async (userData) => {
        set({ loading: true, error: null });
        
        try {
          const response = await api.post('/auth/register', userData);
          const { token, user } = response.data.data;
          
          // Set token in axios defaults
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          set({
            user,
            token,
            isAuthenticated: true,
            loading: false,
            error: null,
          });
          
          return { success: true };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Registration failed';
          set({
            loading: false,
            error: errorMessage,
          });
          
          return { success: false, error: errorMessage };
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (error) {
          // Ignore logout errors
          console.error('Logout error:', error);
        }
        
        // Remove token from axios defaults
        delete api.defaults.headers.common['Authorization'];
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          loading: false,
          error: null,
        });
      },

      updateProfile: async (profileData) => {
        set({ loading: true, error: null });
        
        try {
          const response = await api.put('/auth/profile', { profile: profileData });
          const { user } = response.data.data;
          
          set({
            user,
            loading: false,
            error: null,
          });
          
          return { success: true };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Profile update failed';
          set({
            loading: false,
            error: errorMessage,
          });
          
          return { success: false, error: errorMessage };
        }
      },

      refreshToken: async () => {
        try {
          const { token } = get();
          if (!token) return false;
          
          const response = await api.post('/auth/verify');
          const { user } = response.data.data;
          
          set({
            user,
            isAuthenticated: true,
            error: null,
          });
          
          return true;
        } catch (error) {
          // Token is invalid, logout
          get().logout();
          return false;
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading) => {
        set({ loading });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Restore token in axios defaults when rehydrating
        if (state?.token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
        }
      },
    }
  )
);

export { useAuthStore };
