import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useLazyQuery } from '@apollo/client';
import {
  Search,
  Wallet,
  ArrowRightLeft,
  Database,
  CheckCircle2,
  XCircle,
  Loader2,
  SlidersHorizontal,
  X,
  ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import {
  SEARCH_ACCOUNTS_QUERY,
  SEARCH_TRANSACTIONS_QUERY,
  SEARCH_LEDGERS_QUERY,
} from '@/graphql/queries';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { getSearchHint, searchQuerySchema } from '@/lib/validation';
import { ValidationMessage } from '@/components/ValidationMessage';

// ─── types ───────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'accounts' | 'transactions' | 'ledgers';

interface TxFilter {
  successful?: boolean;
  hasMemo?: boolean;
}

interface AccountFilter {
  minBalance?: string;
  maxBalance?: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function truncate(str: string, start = 10, end = 8) {
  if (str.length <= start + end + 3) return str;
  return `${str.slice(0, start)}...${str.slice(-end)}`;
}

// ─── sub-components ──────────────────────────────────────────────────────────

function AccountRow({ account }: { account: any }) {
  return (
    <Link
      to={`/accounts/${account.accountId}`}
      className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors group"
    >
      <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
        <Wallet className="h-5 w-5 text-blue-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-sm font-medium truncate">{account.accountId}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {parseFloat(account.balance).toLocaleString()} XLM · Seq {account.sequenceNumber}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
    </Link>
  );
}

function TransactionRow({ tx }: { tx: any }) {
  return (
    <Link
      to={`/transactions/${tx.hash}`}
      className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors group"
    >
      <div
        className={clsx(
          'h-10 w-10 rounded-full flex items-center justify-center shrink-0',
          tx.successful ? 'bg-green-500/10' : 'bg-red-500/10'
        )}
      >
        {tx.successful ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-sm font-medium truncate">{tx.hash}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          Ledger #{tx.ledger} · {tx.operationCount} ops ·{' '}
          {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
    </Link>
  );
}

function LedgerRow({ ledger }: { ledger: any }) {
  return (
    <Link
      to="/ledgers"
      className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors group"
    >
      <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
        <Database className="h-5 w-5 text-purple-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-sm font-medium">Ledger #{ledger.sequence}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {ledger.successfulTransactionCount} successful txs · {ledger.operationCount} ops ·{' '}
          {formatDistanceToNow(new Date(ledger.closedAt), { addSuffix: true })}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
    </Link>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Search className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">No results found</h3>
      <p className="text-muted-foreground mt-2 max-w-sm">
        No accounts, transactions, or ledgers matched{' '}
        <span className="font-medium text-foreground">"{query}"</span>. Try a different search
        term.
      </p>
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addEntry } = useSearchHistory();

  const initialQuery = searchParams.get('q') || '';
  const [inputValue, setInputValue] = useState(initialQuery);
  const [inputError, setInputError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [txFilter, setTxFilter] = useState<TxFilter>({});
  const [accountFilter, setAccountFilter] = useState<AccountFilter>({});
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [searchAccounts] = useLazyQuery(SEARCH_ACCOUNTS_QUERY);
  const [searchTransactions] = useLazyQuery(SEARCH_TRANSACTIONS_QUERY);
  const [searchLedgers] = useLazyQuery(SEARCH_LEDGERS_QUERY);

  const runSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(false);

    const type = detectQueryType(q);
    addEntry({ query: q.trim(), type });

    const [accRes, txRes, ledRes] = await Promise.allSettled([
      searchAccounts({ variables: { filter: { accountId: q.trim() } } }),
      searchTransactions({ variables: { first: 50 } }),
      searchLedgers({ variables: { first: 50 } }),
    ]);

    // Accounts
    if (accRes.status === 'fulfilled') {
      setAccounts(accRes.value.data?.accounts?.edges?.map((e: any) => e.node) ?? []);
    }

    // Transactions — filter client-side by hash
    if (txRes.status === 'fulfilled') {
      const all = txRes.value.data?.transactions?.edges?.map((e: any) => e.node) ?? [];
      let filtered = all.filter((tx: any) => tx.hash.toLowerCase().includes(q.toLowerCase()));
      if (txFilter.successful !== undefined)
        filtered = filtered.filter((tx: any) => tx.successful === txFilter.successful);
      if (txFilter.hasMemo !== undefined)
        filtered = filtered.filter((tx: any) =>
          txFilter.hasMemo ? tx.memoType && tx.memoType !== 'none' : !tx.memoType || tx.memoType === 'none'
        );
      setTransactions(filtered);
    }

    // Ledgers — filter client-side by sequence
    if (ledRes.status === 'fulfilled') {
      const all = ledRes.value.data?.ledgers?.edges?.map((e: any) => e.node) ?? [];
      setLedgers(all.filter((l: any) => String(l.sequence).includes(q)));
    }

    setLoading(false);
    setSearched(true);
  };

  // Run search when URL param changes
  useEffect(() => {
    if (initialQuery) runSearch(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setInputError('Please enter a search term');
      return;
    }
    const result = searchQuerySchema.safeParse(trimmed);
    if (!result.success) {
      setInputError(result.error.errors[0]?.message ?? 'Invalid search query');
      return;
    }
    setInputError(null);
    setSearchParams({ q: trimmed });
  };

  const clearQuery = () => {
    setInputValue('');
    setSearchParams({});
    setAccounts([]);
    setTransactions([]);
    setLedgers([]);
    setSearched(false);
  };

  // Counts per tab
  const counts = {
    all: accounts.length + transactions.length + ledgers.length,
    accounts: accounts.length,
    transactions: transactions.length,
    ledgers: ledgers.length,
  };

  const tabs: { key: FilterTab; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All', icon: <Search className="h-4 w-4" /> },
    { key: 'accounts', label: 'Accounts', icon: <Wallet className="h-4 w-4" /> },
    { key: 'transactions', label: 'Transactions', icon: <ArrowRightLeft className="h-4 w-4" /> },
    { key: 'ledgers', label: 'Ledgers', icon: <Database className="h-4 w-4" /> },
  ];

  const showAccounts = activeTab === 'all' || activeTab === 'accounts';
  const showTransactions = activeTab === 'all' || activeTab === 'transactions';
  const showLedgers = activeTab === 'all' || activeTab === 'ledgers';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Search</h1>
        <p className="text-muted-foreground mt-1">
          Find accounts, transactions, and ledgers on the Stellar network
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSubmit} className="flex gap-3" noValidate>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (inputError) setInputError(null);
            }}
            onBlur={() => {
              if (inputValue.trim() && inputValue.trim().length < 2) {
                setInputError('Enter at least 2 characters');
              }
            }}
            placeholder="Search by account ID, transaction hash, or ledger sequence..."
            aria-label="Search query"
            aria-invalid={!!inputError}
            aria-describedby={inputError ? 'search-error' : 'search-hint'}
            className={clsx(
              'w-full pl-10 pr-10 py-2.5 rounded-xl border bg-card focus:outline-none focus:ring-2 text-sm',
              inputError
                ? 'border-destructive focus:ring-destructive/30'
                : 'border-border focus:ring-primary/30'
            )}
            autoFocus
          />
          {inputValue && (
            <button
              type="button"
              onClick={clearQuery}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={clsx(
            'px-3 py-2.5 rounded-xl border transition-colors',
            showFilters
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
          title="Toggle filters"
          aria-pressed={showFilters}
          aria-label="Toggle search filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </form>

      {/* Search input feedback */}
      {inputError ? (
        <ValidationMessage id="search-error" error={inputError} />
      ) : (
        (() => {
          const hint = getSearchHint(inputValue);
          return hint ? <ValidationMessage id="search-hint" hint={hint} /> : null;
        })()
      )}

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
          <h3 className="text-sm font-semibold">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Transaction filters */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Transactions
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-20">Status</span>
                <div className="flex gap-1">
                  {[
                    { label: 'Any', value: undefined },
                    { label: 'Success', value: true },
                    { label: 'Failed', value: false },
                  ].map((opt) => (
                    <button
                      key={String(opt.label)}
                      onClick={() => setTxFilter((f) => ({ ...f, successful: opt.value }))}
                      className={clsx(
                        'px-3 py-1 rounded-lg text-xs font-medium transition-colors',
                        txFilter.successful === opt.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-20">Memo</span>
                <div className="flex gap-1">
                  {[
                    { label: 'Any', value: undefined },
                    { label: 'Has memo', value: true },
                    { label: 'No memo', value: false },
                  ].map((opt) => (
                    <button
                      key={String(opt.label)}
                      onClick={() => setTxFilter((f) => ({ ...f, hasMemo: opt.value }))}
                      className={clsx(
                        'px-3 py-1 rounded-lg text-xs font-medium transition-colors',
                        txFilter.hasMemo === opt.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Account filters */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Accounts
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-20">Min XLM</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={accountFilter.minBalance ?? ''}
                  onChange={(e) => {
                    setAccountFilter((f) => ({ ...f, minBalance: e.target.value || undefined }));
                    setBalanceError(null);
                  }}
                  onBlur={() => {
                    if (
                      accountFilter.minBalance &&
                      accountFilter.maxBalance &&
                      parseFloat(accountFilter.minBalance) > parseFloat(accountFilter.maxBalance)
                    ) {
                      setBalanceError('Min balance must be ≤ max balance');
                    }
                  }}
                  aria-label="Minimum XLM balance"
                  className="w-28 px-3 py-1 rounded-lg border border-border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-20">Max XLM</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="∞"
                    value={accountFilter.maxBalance ?? ''}
                    onChange={(e) => {
                      setAccountFilter((f) => ({ ...f, maxBalance: e.target.value || undefined }));
                      setBalanceError(null);
                    }}
                    onBlur={() => {
                      if (
                        accountFilter.minBalance &&
                        accountFilter.maxBalance &&
                        parseFloat(accountFilter.minBalance) > parseFloat(accountFilter.maxBalance)
                      ) {
                        setBalanceError('Min balance must be ≤ max balance');
                      }
                    }}
                    aria-invalid={!!balanceError}
                    aria-label="Maximum XLM balance"
                    className={clsx(
                      'w-28 px-3 py-1 rounded-lg border bg-muted/50 text-sm focus:outline-none focus:ring-2',
                      balanceError
                        ? 'border-destructive focus:ring-destructive/30'
                        : 'border-border focus:ring-primary/30'
                    )}
                  />
                </div>
                {balanceError && (
                  <ValidationMessage error={balanceError} className="ml-[88px]" />
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
            <button
              onClick={() => {
                setTxFilter({});
                setAccountFilter({});
                setBalanceError(null);
              }}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Reset filters
            </button>
            <button
              onClick={() => {
                if (inputValue.trim()) runSearch(inputValue.trim());
              }}
              className="px-4 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Apply & search
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      {searched && (
        <div className="flex items-center gap-1 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.icon}
              {tab.label}
              {counts[tab.key] > 0 && (
                <span
                  className={clsx(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                    activeTab === tab.key
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Results */}
      {!loading && searched && (
        <>
          {counts.all === 0 ? (
            <EmptyState query={initialQuery} />
          ) : (
            <div className="space-y-6">
              {/* Accounts section */}
              {showAccounts && accounts.length > 0 && (
                <section>
                  {activeTab === 'all' && (
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        Accounts
                      </h2>
                      {accounts.length > 3 && (
                        <button
                          onClick={() => setActiveTab('accounts')}
                          className="text-xs text-primary hover:underline"
                        >
                          View all {accounts.length}
                        </button>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    {(activeTab === 'all' ? accounts.slice(0, 3) : accounts).map((a) => (
                      <AccountRow key={a.accountId} account={a} />
                    ))}
                  </div>
                </section>
              )}

              {/* Transactions section */}
              {showTransactions && transactions.length > 0 && (
                <section>
                  {activeTab === 'all' && (
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4" />
                        Transactions
                      </h2>
                      {transactions.length > 3 && (
                        <button
                          onClick={() => setActiveTab('transactions')}
                          className="text-xs text-primary hover:underline"
                        >
                          View all {transactions.length}
                        </button>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    {(activeTab === 'all' ? transactions.slice(0, 3) : transactions).map((tx) => (
                      <TransactionRow key={tx.hash} tx={tx} />
                    ))}
                  </div>
                </section>
              )}

              {/* Ledgers section */}
              {showLedgers && ledgers.length > 0 && (
                <section>
                  {activeTab === 'all' && (
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Ledgers
                      </h2>
                      {ledgers.length > 3 && (
                        <button
                          onClick={() => setActiveTab('ledgers')}
                          className="text-xs text-primary hover:underline"
                        >
                          View all {ledgers.length}
                        </button>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    {(activeTab === 'all' ? ledgers.slice(0, 3) : ledgers).map((l) => (
                      <LedgerRow key={l.sequence} ledger={l} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}

      {/* Initial state — no query yet */}
      {!loading && !searched && !initialQuery && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Search the Stellar network</h3>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm">
            Enter an account address (G…), transaction hash (64 hex chars), or ledger sequence
            number to get started.
          </p>
        </div>
      )}
    </div>
  );
}

// helper used inside the component — defined here to avoid circular import
function detectQueryType(q: string): 'account' | 'transaction' | 'ledger' | 'general' {
  const trimmed = q.trim();
  if (/^G[A-Z2-7]{55}$/.test(trimmed)) return 'account';
  if (/^[a-fA-F0-9]{64}$/.test(trimmed)) return 'transaction';
  if (/^\d+$/.test(trimmed)) return 'ledger';
  return 'general';
}
