/**
 * Authentication Store
 * 
 * Manages user authentication state including:
 * - User session
 * - Authentication status
 * - Login/logout functionality
 * - Token management
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthState {
  // Authentication state
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        isAuthenticated: false,
        user: null,
        token: null,

        // Login action - in a real app, this would call an API
        login: async (email: string, password: string) => {
          // Simulate API call
          // In production, replace with actual authentication API call
          if (email && password) {
            const mockUser: User = {
              id: '1',
              email,
              name: email.split('@')[0],
            };
            const mockToken = 'mock-jwt-token';
            
            set({
              isAuthenticated: true,
              user: mockUser,
              token: mockToken,
            });
          }
        },

        // Logout action
        logout: () => {
          set({
            isAuthenticated: false,
            user: null,
            token: null,
          });
        },

        // Set user directly (useful for OAuth flows)
        setUser: (user: User) => {
          set({ user, isAuthenticated: true });
        },

        // Set token directly
        setToken: (token: string) => {
          set({ token });
        },

        // Clear all auth data
        clearAuth: () => {
          set({
            isAuthenticated: false,
            user: null,
            token: null,
          });
        },
      }),
      {
        name: 'stellar-auth-store',
        partialize: (state) => ({
          isAuthenticated: state.isAuthenticated,
          user: state.user,
          token: state.token,
        }),
      }
    ),
    { name: 'StellarAuthStore' }
  )
);
