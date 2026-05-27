import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { TRANSACTIONS_QUERY } from '@/graphql/queries';
import { DataTable } from '@/components/DataTable';
import { FilterBar, FilterRow, ToggleGroup, RangeInput, DateRangeInput } from '@/components/FilterBar';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, XCircle, Search, RefreshCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFilterSort } from '@/hooks/useFilterSort';
import type { FilterPreset } from '@/components/FilterBar';
import { transactionFiltersSchema } from '@/lib/validation';
import { clsx } from 'clsx';

// ── filter defaults ──────────────────────────────────────────────────────────

const DEFAULTS = {
  search: '',
  successful: '' as '' | 'true' | 'false',
  hasMemo: '' as '' | 'true' | 'false',
  memoType: '',
  minFee: '',
  maxFee: '',
  startTime: '',
  endTime: '',
};

type TxFilters = typeof DEFAULTS;

// ── helpers ──────────────────────────────────────────────────────────────────

function buildGqlFilter(filters: TxFilters) {
  const f: Record<string, unknown> = {};
  if (filters.successful === 'true') f.successful = true;
  if (filters.successful === 'false') f.successful = false;
  if (filters.hasMemo === 'true') f.hasMemo = true;
  if (filters.hasMemo === 'false') f.hasMemo = false;
  if (filters.memoType) f.memoType = filters.memoType;
  if (filters.minFee) f.minFee = parseInt(filters.minFee);
  if (filters.maxFee) f.maxFee = parseInt(filters.maxFee);
  return Object.keys(f).length ? f : undefined;
}

function buildTimeRange(filters: TxFilters) {
  if (!filters.startTime && !filters.endTime) return undefined;
  return {
    startTime: filters.startTime || undefined,
    endTime: filters.endTime || undefined,
  };
}

function clientSort(txs: any[], field: string, dir: 'asc' | 'desc') {
  return [...txs].sort((a, b) => {
    let av: number | string = 0;
    let bv: number | string = 0;
    switch (field) {
      case 'createdAt':
        av = new Date(a.createdAt).getTime();
        bv = new Date(b.createdAt).getTime();
        break;
      case 'feeCharged':
        av = a.feeCharged;
        bv = b.feeCharged;
        break;
      case 'operationCount':
        av = a.operationCount;
        bv = b.operationCount;
        break;
      case 'ledger':
        av = a.ledger;
        bv = b.ledger;
        break;
      default:
        return 0;
    }
    return dir === 'asc' ? (av < bv ? -1 : 1) : av > bv ? -1 : 1;
  });
}

// ── component ────────────────────────────────────────────────────────────────

export function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterErrors, setFilterErrors] = useState<Record<string, string>>({});
  const { filters, sort, setFilter, setSort, resetFilters, activeCount } =
    useFilterSort<TxFilters>({
      defaults: DEFAULTS,
      sortDefaults: { field: 'createdAt', dir: 'desc' },
    });

  const after = searchParams.get('after') ?? undefined;

  const { data, loading, fetchMore, refetch } = useQuery(TRANSACTIONS_QUERY, {
    variables: {
      first: 20,
      after,
      filter: buildGqlFilter(filters),
      timeRange: buildTimeRange(filters),
    },
    pollInterval: 10000,
    notifyOnNetworkStatusChange: true,
  });

  // Refetch when filters change
  const prevFiltersRef = useRef(filters);
  useEffect(() => {
    if (JSON.stringify(prevFiltersRef.current) !== JSON.stringify(filters)) {
      prevFiltersRef.current = filters;
      refetch({
        first: 20,
        after: undefined,
        filter: buildGqlFilter(filters),
        timeRange: buildTimeRange(filters),
      });
    }
  }, [filters, refetch]);

  const rawTxs = data?.transactions?.edges.map((e: any) => e.node) || [];
  const pageInfo = data?.transactions?.pageInfo;
  const totalCount = data?.transactions?.totalCount;

  // Client-side search filter (hash / source account)
  const searched = filters.search
    ? rawTxs.filter(
        (tx: any) =>
          tx.hash.toLowerCase().includes(filters.search.toLowerCase()) ||
          tx.sourceAccount.toLowerCase().includes(filters.search.toLowerCase())
      )
    : rawTxs;

  // Client-side sort
  const sorted = clientSort(searched, sort.field, sort.dir);

  // ── presets ────────────────────────────────────────────────────────────────

  const validateFilters = (updated: TxFilters) => {
    const result = transactionFiltersSchema.safeParse(updated);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach((e) => {
        const key = e.path[0] as string;
        errs[key] = e.message;
      });
      setFilterErrors(errs);
    } else {
      setFilterErrors({});
    }
  };

  const presets: FilterPreset[] = [
    {
      label: 'Successful only',
      description: 'Show only successful transactions',
      apply: () => {
        resetFilters();
        setFilter('successful', 'true');
      },
    },
    {
      label: 'Failed only',
      description: 'Show only failed transactions',
      apply: () => {
        resetFilters();
        setFilter('successful', 'false');
      },
    },
    {
      label: 'With memo',
      description: 'Transactions that carry a memo',
      apply: () => {
        resetFilters();
        setFilter('hasMemo', 'true');
      },
    },
    {
      label: 'High fee (>1000)',
      description: 'Fee charged above 1000 stroops',
      apply: () => {
        resetFilters();
        setFilter('minFee', '1000');
      },
    },
    {
      label: 'Last 24h',
      description: 'Transactions from the last 24 hours',
      apply: () => {
        resetFilters();
        const start = new Date(Date.now() - 24 * 60 * 60 * 1000);
        setFilter('startTime', start.toISOString().slice(0, 16));
      },
    },
  ];

  // ── columns ────────────────────────────────────────────────────────────────

  const columns = [
    {
      header: 'Status',
      accessor: (tx: any) =>
        tx.successful ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500" />
        ),
    },
    {
      header: 'Hash',
      accessor: (tx: any) => (
        <Link
          to={`/transactions/${tx.hash}`}
          className="text-primary font-mono hover:underline font-bold"
        >
          {tx.hash.slice(0, 8)}…{tx.hash.slice(-8)}
        </Link>
      ),
    },
    {
      header: 'Ledger',
      sortField: 'ledger',
      accessor: (tx: any) => <span className="font-mono">#{tx.ledger}</span>,
    },
    {
      header: 'Source Account',
      accessor: (tx: any) => (
        <span className="text-muted-foreground font-mono text-xs">
          {tx.sourceAccount.slice(0, 12)}…
        </span>
      ),
    },
    {
      header: 'Ops',
      sortField: 'operationCount',
      accessor: (tx: any) => (
        <span className="font-medium tabular-nums">{tx.operationCount}</span>
      ),
      className: 'text-center',
    },
    {
      header: 'Fee (stroops)',
      sortField: 'feeCharged',
      accessor: (tx: any) => (
        <span className="font-mono tabular-nums">{tx.feeCharged?.toLocaleString()}</span>
      ),
      className: 'text-right',
    },
    {
      header: 'Age',
      sortField: 'createdAt',
      accessor: (tx: any) =>
        formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true }),
      className: 'text-right',
    },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <p className="text-muted-foreground text-sm font-medium">Live network activity</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
        >
          <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
          Sync Now
        </button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input
          type="text"
          placeholder="Search by hash or source account…"
          aria-label="Search transactions"
          className={clsx(
            'w-full pl-9 pr-4 py-2.5 bg-card border rounded-xl focus:outline-none focus:ring-2 text-sm',
            filterErrors.search
              ? 'border-destructive focus:ring-destructive/30'
              : 'border-border focus:ring-primary/30'
          )}
          value={filters.search}
          onChange={(e) => {
            setFilter('search', e.target.value);
            if (filterErrors.search) setFilterErrors((prev) => ({ ...prev, search: '' }));
          }}
        />
      </div>

      {/* Filter bar */}
      <FilterBar activeCount={activeCount} onReset={() => { resetFilters(); setFilterErrors({}); }} presets={presets}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <FilterRow label="Status">
            <ToggleGroup
              options={[
                { label: 'Any', value: '' },
                { label: 'Successful', value: 'true' },
                { label: 'Failed', value: 'false' },
              ]}
              value={filters.successful}
              onChange={(v) => setFilter('successful', v as string)}
            />
          </FilterRow>

          <FilterRow label="Memo">
            <ToggleGroup
              options={[
                { label: 'Any', value: '' },
                { label: 'Has memo', value: 'true' },
                { label: 'No memo', value: 'false' },
              ]}
              value={filters.hasMemo}
              onChange={(v) => setFilter('hasMemo', v as string)}
            />
          </FilterRow>

          <FilterRow label="Memo type">
            <select
              value={filters.memoType}
              onChange={(e) => setFilter('memoType', e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-label="Filter by memo type"
            >
              <option value="">Any</option>
              <option value="none">None</option>
              <option value="text">Text</option>
              <option value="id">ID</option>
              <option value="hash">Hash</option>
              <option value="return">Return</option>
            </select>
          </FilterRow>

          <FilterRow label="Fee (stroops)">
            <RangeInput
              minValue={filters.minFee}
              maxValue={filters.maxFee}
              onMinChange={(v) => {
                setFilter('minFee', v);
                validateFilters({ ...filters, minFee: v });
              }}
              onMaxChange={(v) => {
                setFilter('maxFee', v);
                validateFilters({ ...filters, maxFee: v });
              }}
              placeholder={{ min: '0', max: '∞' }}
              maxError={filterErrors.maxFee}
            />
          </FilterRow>

          <FilterRow label="Time range">
            <DateRangeInput
              startValue={filters.startTime}
              endValue={filters.endTime}
              onStartChange={(v) => {
                setFilter('startTime', v);
                validateFilters({ ...filters, startTime: v });
              }}
              onEndChange={(v) => {
                setFilter('endTime', v);
                validateFilters({ ...filters, endTime: v });
              }}
              endError={filterErrors.endTime}
            />
          </FilterRow>
        </div>
      </FilterBar>

      {/* Table */}
      <DataTable
        caption="Transactions"
        columns={columns}
        data={sorted}
        loading={loading}
        sort={sort}
        onSort={setSort}
        totalCount={totalCount}
        hasNextPage={pageInfo?.hasNextPage}
        hasPrevPage={pageInfo?.hasPreviousPage}
        onNextPage={() => {
          setSearchParams((p) => {
            const n = new URLSearchParams(p);
            n.set('after', pageInfo?.endCursor ?? '');
            return n;
          });
        }}
        onPrevPage={() => {
          setSearchParams((p) => {
            const n = new URLSearchParams(p);
            n.delete('after');
            return n;
          });
        }}
      />
    </div>
  );
}
