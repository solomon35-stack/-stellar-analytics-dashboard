import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ApolloProvider } from '@apollo/client'
import { Toaster } from 'react-hot-toast'

import App from './App'
import { apolloClient } from './graphql/apollo-client'
import './index.css'

// ── Theme hydration ───────────────────────────────────────────────────────────
// Apply the persisted theme before the first render to avoid a flash of the
// wrong theme. We read directly from localStorage to avoid importing the store
// before React is initialized.
(function applyInitialTheme() {
  try {
    const raw = localStorage.getItem('stellar-preferences-store');
    const stored = raw ? JSON.parse(raw) : null;
    const theme: string = stored?.state?.theme ?? 'system';

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = theme === 'dark' || (theme === 'system' && prefersDark);

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch {
    // If anything fails, leave the default (light) theme in place
  }
})();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={apolloClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'hsl(var(--card))',
              color: 'hsl(var(--card-foreground))',
              border: '1px solid hsl(var(--border))',
            },
          }}
        />
      </BrowserRouter>
    </ApolloProvider>
  </React.StrictMode>,
)
