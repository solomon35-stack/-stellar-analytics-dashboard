import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Network,
  Users,
  ArrowRightLeft,
  Coins,
  Menu,
  X,
  Moon,
  Sun,
  Bell,
  Database,
} from 'lucide-react';
import { clsx } from 'clsx';
import { GlobalSearch } from '@/components/GlobalSearch';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
  const location = useLocation();

  // Ref to restore focus to the menu button when sidebar closes
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  // Ref to the first focusable element inside the mobile sidebar
  const sidebarFirstFocusRef = useRef<HTMLButtonElement>(null);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Network', href: '/network', icon: Network },
    { name: 'Accounts', href: '/accounts', icon: Users },
    { name: 'Transactions', href: '/transactions', icon: ArrowRightLeft },
    { name: 'Assets', href: '/assets', icon: Coins },
    { name: 'Ledgers', href: '/ledgers', icon: Database },
  ];

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  // Move focus into sidebar when it opens; restore when it closes
  useEffect(() => {
    if (sidebarOpen) {
      sidebarFirstFocusRef.current?.focus();
    } else {
      menuButtonRef.current?.focus();
    }
  }, [sidebarOpen]);

  // Close sidebar on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  // Trap focus inside the mobile sidebar while it is open
  useEffect(() => {
    if (!sidebarOpen) return;

    const sidebar = document.getElementById('mobile-sidebar');
    if (!sidebar) return;

    const focusable = sidebar.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [sidebarOpen]);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* ── Skip-to-content link ─────────────────────────────────────────────
          Visible only on keyboard focus; lets screen-reader / keyboard users
          jump straight to the page content without tabbing through nav.
      ──────────────────────────────────────────────────────────────────── */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-medium focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* ── Mobile sidebar overlay ───────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
            onClick={closeSidebar}
          />

          {/* Sidebar panel */}
          <div
            id="mobile-sidebar"
            className="fixed left-0 top-0 h-full w-72 bg-card border-r shadow-2xl"
          >
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-2">
                <div
                  className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold"
                  aria-hidden="true"
                >
                  S
                </div>
                <span className="text-xl font-bold tracking-tight">Stellar Analytics</span>
              </div>
              <button
                ref={sidebarFirstFocusRef}
                onClick={closeSidebar}
                className="p-2 rounded-full hover:bg-accent transition-colors"
                aria-label="Close navigation menu"
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            <nav aria-label="Mobile navigation">
              <ul role="list" className="px-4 mt-4 space-y-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={clsx(
                          'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        )}
                        onClick={closeSidebar}
                      >
                        <item.icon className="h-5 w-5" aria-hidden="true" />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
      )}

      {/* ── Desktop sidebar ──────────────────────────────────────────────── */}
      <div
        className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64 lg:bg-card lg:border-r"
        aria-label="Desktop sidebar"
      >
        <div className="flex h-20 shrink-0 items-center px-8 border-b border-border/50">
          <Link to="/" className="flex items-center gap-3" aria-label="Stellar Analytics home">
            <div
              className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-bold shadow-inner"
              aria-hidden="true"
            >
              S
            </div>
            <span className="text-lg font-bold tracking-tight">Stellar Analytics</span>
          </Link>
        </div>

        <nav aria-label="Main navigation">
          <ul role="list" className="px-4 mt-8 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={clsx(
                      'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all group',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}
                  >
                    <item.icon
                      className={clsx(
                        'h-5 w-5',
                        isActive
                          ? 'text-primary-foreground'
                          : 'group-hover:text-primary transition-colors'
                      )}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* ── Main content area ────────────────────────────────────────────── */}
      <div className="lg:pl-64">
        {/* Top bar / Header */}
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-card/80 backdrop-blur-md px-4 sm:gap-x-6 sm:px-6 lg:px-8">
          {/* Mobile menu toggle */}
          <button
            ref={menuButtonRef}
            type="button"
            className="lg:hidden p-2 -ml-2 hover:bg-accent rounded-lg transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
            aria-controls="mobile-sidebar"
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              {/* Global Search — hidden on mobile (shown in mobile search bar below) */}
              <div className="hidden sm:block w-full max-w-md">
                <GlobalSearch />
              </div>
            </div>

            <div className="flex items-center gap-x-2 sm:gap-x-4 lg:gap-x-5">
              {/* Network Status Badge */}
              <div
                role="status"
                aria-live="polite"
                aria-label="Network connection status: Mainnet live"
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20"
              >
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" aria-hidden="true" />
                <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">
                  Mainnet
                </span>
              </div>

              <div className="h-6 w-[1px] bg-border hidden sm:block" aria-hidden="true" />

              {/* Dark mode toggle — 44px touch target */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-pressed={darkMode}
              >
                {darkMode ? (
                  <Sun className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Moon className="h-5 w-5" aria-hidden="true" />
                )}
              </button>

              {/* Notifications — 44px touch target */}
              <button
                className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all relative min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" aria-hidden="true" />
                <span
                  className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full border-2 border-card"
                  aria-label="Unread notifications"
                />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile search bar — shown only on small screens below the header */}
        <div className="sm:hidden px-4 py-2 border-b border-border bg-card/80 backdrop-blur-md">
          <GlobalSearch />

        {/* Page content */}
        <main id="main-content" tabIndex={-1} className="py-8 outline-none">
          <div className="px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
