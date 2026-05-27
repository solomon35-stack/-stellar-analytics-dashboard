/**
 * Global State Management
 * 
 * This directory contains all Zustand stores for the application.
 * Each store manages a specific domain of state:
 * 
 * - useAppStore: Global application state (sidebar, notifications, etc.)
 * - usePreferencesStore: User preferences (theme, language, etc.)
 * - useAuthStore: User authentication state (session, login/logout, etc.)
 * - useSearchHistoryStore: Search history (already exists in hooks/)
 * 
 * All stores use:
 * - Zustand for state management
 * - Persist middleware for localStorage persistence
 * - DevTools middleware for debugging
 */

export { useAppStore, type Notification } from './appStore';
export { usePreferencesStore, type Theme, type Language, type Currency } from './preferencesStore';
export { useAuthStore, type User } from './authStore';
