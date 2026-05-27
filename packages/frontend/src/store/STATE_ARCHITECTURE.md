# State Management Architecture

## Overview

The Stellar Analytics Dashboard uses **Zustand** for global client-side state management. Zustand provides:

- Minimal boilerplate with TypeScript support out of the box
- Built-in `persist` middleware for localStorage persistence with versioning and migration
- Built-in `devtools` middleware for Redux DevTools integration
- No Context Provider overhead — stores are imported directly as hooks
- Simple, composable API

Server state (data from the GraphQL API) is managed by **Apollo Client** with `InMemoryCache`.

---

## Directory Layout

```
src/store/
├── index.ts                    # Re-exports all stores and types
├── appStore.ts                 # Global UI state (sidebar, notifications, modals)
├── preferencesStore.ts         # User preferences (theme, language, etc.)
├── authStore.ts                # Authentication state (user, token)
└── STATE_ARCHITECTURE.md       # This file

src/hooks/
├── useNotifications.ts         # Bridges appStore notifications ↔ react-hot-toast
├── useSearchHistory.ts         # Persisted search history (Zustand store in hooks/)
├── useFilterSort.ts            # URL-synced filter + sort state
├── useRealtimeUpdates.ts       # Apollo subscribeToMore wrapper
└── useWebSocketStatus.ts       # WebSocket connection status
```

---

## Stores

### 1. App Store (`useAppStore`)

**Purpose**: Global UI state shared across components.

**State**:
| Field | Type | Persisted | Description |
|---|---|---|---|
| `sidebarOpen` | `boolean` | ✅ | Mobile sidebar toggle |
| `notifications` | `Notification[]` | ✅ | In-app notification list (max 50) |
| `globalLoading` | `boolean` | ❌ | Global loading overlay |
| `activeModal` | `string \| null` | ❌ | Currently open modal ID |

**Actions**: `setSidebarOpen`, `toggleSidebar`, `addNotification`, `removeNotification`, `markNotificationRead`, `clearNotifications`, `setGlobalLoading`, `openModal`, `closeModal`

**DevTools name**: `StellarAppStore`

**Usage**:
```typescript
import { useAppStore } from '@/store';

const { sidebarOpen, toggleSidebar, notifications } = useAppStore();
```

---

### 2. Preferences Store (`usePreferencesStore`)

**Purpose**: User preferences that persist across sessions.

**State** (all persisted):
| Field | Type | Default | Description |
|---|---|---|---|
| `theme` | `'light' \| 'dark' \| 'system'` | `'system'` | Color theme |
| `language` | `Language` | `'en'` | UI language |
| `fontSize` | `'small' \| 'medium' \| 'large'` | `'medium'` | Font size |
| `reducedMotion` | `boolean` | `false` | Accessibility: reduce motion |
| `highContrast` | `boolean` | `false` | Accessibility: high contrast |
| `currency` | `Currency` | `'XLM'` | Display currency |
| `timezone` | `Timezone` | `'UTC'` | Timestamp timezone |
| `dateFormat` | `'short' \| 'medium' \| 'long'` | `'medium'` | Date format |
| `timeFormat` | `'12h' \| '24h'` | `'24h'` | Time format |
| `enableNotifications` | `boolean` | `true` | In-app notifications |
| `enableAnimations` | `boolean` | `true` | UI animations |
| `enableRealtimeUpdates` | `boolean` | `true` | Live data subscriptions |
| `dataRefreshInterval` | `number` | `30` | Poll interval in seconds |
| `analyticsEnabled` | `boolean` | `true` | Analytics consent |

**Schema version**: `1` (with migration support)

**DevTools name**: `StellarPreferencesStore`

**Usage**:
```typescript
import { usePreferencesStore } from '@/store';

const { theme, setTheme, enableRealtimeUpdates } = usePreferencesStore();
```

---

### 3. Auth Store (`useAuthStore`)

**Purpose**: User authentication state.

**State** (partially persisted — `isAuthenticated`, `user`, `token`):
| Field | Type | Description |
|---|---|---|
| `isAuthenticated` | `boolean` | Whether the user is logged in |
| `user` | `User \| null` | Current user object |
| `token` | `string \| null` | JWT or session token |

**Actions**: `login(email, password)`, `logout()`, `setUser(user)`, `setToken(token)`, `clearAuth()`

**Note**: The `login` action currently uses a mock implementation. Replace with a real API call for production.

**DevTools name**: `StellarAuthStore`

**Usage**:
```typescript
import { useAuthStore } from '@/store';

const { isAuthenticated, user, login, logout } = useAuthStore();
```

---

### 4. Search History (`useSearchHistory`)

**Location**: `src/hooks/useSearchHistory.ts`

**Purpose**: Persisted search history (max 20 entries).

**State** (fully persisted):
- `history`: `SearchHistoryEntry[]` — array of `{ query, type, timestamp }`

**Actions**: `addEntry(entry)`, `removeEntry(query)`, `clearHistory()`

**localStorage key**: `stellar-search-history`

---

## Hooks

### `useNotifications`

Bridges `useAppStore` notifications with `react-hot-toast`. Use this instead of calling `addNotification` directly when you also want a toast.

```typescript
import { useNotifications } from '@/hooks/useNotifications';

const { notify, notifications, unreadCount } = useNotifications();

// Shows a toast AND adds to the persistent notification list
notify({ type: 'success', title: 'Saved', message: 'Changes saved.' });
notify({ type: 'error', title: 'Failed', message: 'Could not connect.' });
notify({ type: 'warning', title: 'Slow connection' });
notify({ type: 'info', title: 'New ledger', message: '#12345678 closed.' });
```

### `useFilterSort`

URL-synced filter + sort state. Filters survive page refresh and are shareable via URL.

```typescript
const { filters, sort, setFilter, setSort, resetFilters, activeCount } =
  useFilterSort<MyFilters>({ defaults, sortDefaults });
```

### `useRealtimeUpdates`

Wraps Apollo's `subscribeToMore` to prepend new items to paginated lists with optional toast notifications and pause support.

### `useWebSocketStatus`

Returns the current WebSocket connection status (`connecting`, `connected`, `reconnecting`, `disconnected`, `error`) with boolean helpers `isLive`, `isError`, `isPending`.

---

## State Hydration

### Theme (Flash-free)

The persisted theme is applied **before the first React render** in `main.tsx` by reading directly from `localStorage`. This prevents a flash of the wrong theme on page load.

### All Other State

All Zustand stores with `persist` middleware hydrate automatically from `localStorage` on first access. No manual hydration is required.

---

## Debugging

### Redux DevTools

1. Install the [Redux DevTools Extension](https://github.com/reduxjs/redux-devtools)
2. Open DevTools → select the store by name:
   - `StellarAppStore`
   - `StellarPreferencesStore`
   - `StellarAuthStore`

### localStorage Keys

| Key | Store |
|---|---|
| `stellar-app-store` | App store (sidebar, notifications) |
| `stellar-preferences-store` | Preferences store |
| `stellar-auth-store` | Auth store |
| `stellar-search-history` | Search history |

---

## Best Practices

### Use selectors for performance

```typescript
// ✅ Only re-renders when notifications change
const notifications = useAppStore((state) => state.notifications);

// ⚠️ Re-renders on any state change
const { notifications, sidebarOpen } = useAppStore();
```

### Persist only what's necessary

Use `partialize` to exclude transient UI state (loading flags, active modals) from localStorage.

### Handle schema migrations

When updating a store's shape, bump `version` and add a `migrate` function:

```typescript
persist(
  (set) => ({ /* ... */ }),
  {
    name: 'store-name',
    version: 2,
    migrate: (persistedState, version) => {
      if (version === 1) {
        return { ...persistedState, newField: defaultValue };
      }
      return persistedState;
    },
  }
)
```

---

## State Boundaries

| Concern | Solution |
|---|---|
| Server data (API responses) | Apollo Client + InMemoryCache |
| Global UI state | `useAppStore` (Zustand) |
| User preferences | `usePreferencesStore` (Zustand + persist) |
| Authentication | `useAuthStore` (Zustand + persist) |
| Search history | `useSearchHistory` (Zustand + persist) |
| URL-synced filters | `useFilterSort` (React Router `useSearchParams`) |
| Form state | `react-hook-form` |
| Transient toasts | `react-hot-toast` |
| Persistent notifications | `useNotifications` → `useAppStore` + `react-hot-toast` |
