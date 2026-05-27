/**
 * Preferences Store
 * 
 * User preferences that persist across sessions.
 * Includes theme, language, and other user-specific settings.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';
export type Language = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh';
export type Currency = 'XLM' | 'USD' | 'EUR' | 'GBP' | 'JPY';
export type Timezone = 'UTC' | 'local' | string;

export interface UserPreferences {
  // Appearance
  theme: Theme;
  language: Language;
  fontSize: 'small' | 'medium' | 'large';
  reducedMotion: boolean;
  highContrast: boolean;

  // Data display
  currency: Currency;
  timezone: Timezone;
  dateFormat: 'short' | 'medium' | 'long';
  timeFormat: '12h' | '24h';

  // Notifications
  enableNotifications: boolean;
  notificationSound: boolean;
  emailNotifications: boolean;

  // Privacy
  analyticsEnabled: boolean;
  crashReporting: boolean;

  // Performance
  enableAnimations: boolean;
  enableRealtimeUpdates: boolean;
  dataRefreshInterval: number; // in seconds
}

interface PreferencesState extends UserPreferences {
  // Actions
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setCurrency: (currency: Currency) => void;
  setTimezone: (timezone: Timezone) => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  setReducedMotion: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  setEnableNotifications: (enabled: boolean) => void;
  setEnableAnimations: (enabled: boolean) => void;
  setEnableRealtimeUpdates: (enabled: boolean) => void;
  setDataRefreshInterval: (interval: number) => void;
  setAnalyticsEnabled: (enabled: boolean) => void;
  resetPreferences: () => void;
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  language: 'en',
  fontSize: 'medium',
  reducedMotion: false,
  highContrast: false,
  currency: 'XLM',
  timezone: 'UTC',
  dateFormat: 'medium',
  timeFormat: '24h',
  enableNotifications: true,
  notificationSound: true,
  emailNotifications: false,
  analyticsEnabled: true,
  crashReporting: true,
  enableAnimations: true,
  enableRealtimeUpdates: true,
  dataRefreshInterval: 30,
};

export const usePreferencesStore = create<PreferencesState>()(
  devtools(
    persist(
      (set) => ({
        ...defaultPreferences,

        setTheme: (theme) => set({ theme }),
        setLanguage: (language) => set({ language }),
        setCurrency: (currency) => set({ currency }),
        setTimezone: (timezone) => set({ timezone }),
        setFontSize: (fontSize) => set({ fontSize }),
        setReducedMotion: (reducedMotion) => set({ reducedMotion }),
        setHighContrast: (highContrast) => set({ highContrast }),
        setEnableNotifications: (enableNotifications) => set({ enableNotifications }),
        setEnableAnimations: (enableAnimations) => set({ enableAnimations }),
        setEnableRealtimeUpdates: (enableRealtimeUpdates) => set({ enableRealtimeUpdates }),
        setDataRefreshInterval: (dataRefreshInterval) => set({ dataRefreshInterval }),
        setAnalyticsEnabled: (analyticsEnabled) => set({ analyticsEnabled }),
        resetPreferences: () => set(defaultPreferences),
      }),
      {
        name: 'stellar-preferences-store',
        version: 1,
        // Migration function for future schema changes
        migrate: (persistedState: any, version: number) => {
          if (version === 0) {
            // Migration from version 0 to 1
            return {
              ...persistedState,
              // Add any new default values
              enableRealtimeUpdates: true,
              dataRefreshInterval: 30,
            } as PreferencesState;
          }
          return persistedState as PreferencesState;
        },
      }
    ),
    { name: 'StellarPreferencesStore' }
  )
);
