import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SearchHistoryEntry {
  query: string;
  type: 'account' | 'transaction' | 'ledger' | 'general';
  timestamp: number;
}

interface SearchHistoryState {
  history: SearchHistoryEntry[];
  addEntry: (entry: Omit<SearchHistoryEntry, 'timestamp'>) => void;
  removeEntry: (query: string) => void;
  clearHistory: () => void;
}

export const useSearchHistory = create<SearchHistoryState>()(
  persist(
    (set) => ({
      history: [],
      addEntry: (entry) =>
        set((state) => {
          // Remove duplicate if exists, then prepend
          const filtered = state.history.filter((h) => h.query !== entry.query);
          const newEntry: SearchHistoryEntry = { ...entry, timestamp: Date.now() };
          return { history: [newEntry, ...filtered].slice(0, 20) };
        }),
      removeEntry: (query) =>
        set((state) => ({
          history: state.history.filter((h) => h.query !== query),
        })),
      clearHistory: () => set({ history: [] }),
    }),
    { name: 'stellar-search-history' }
  )
);
