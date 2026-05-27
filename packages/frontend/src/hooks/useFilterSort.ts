/**
 * useFilterSort
 *
 * Generic hook that keeps filter + sort state in sync with URL search params
 * so filters survive page refresh and are shareable via URL.
 *
 * Usage:
 *   const { filters, sort, setFilter, setSort, resetFilters, activeCount } =
 *     useFilterSort<MyFilters>({ defaults, sortDefaults });
 */
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface SortState {
  field: string;
  dir: 'asc' | 'desc';
}

type Primitive = string | number | boolean | undefined;

export function useFilterSort<F extends Record<string, Primitive>>(options: {
  defaults: F;
  sortDefaults: SortState;
}) {
  const { defaults, sortDefaults } = options;
  const [searchParams, setSearchParams] = useSearchParams();

  // ── read ──────────────────────────────────────────────────────────────────

  const filters = useMemo<F>(() => {
    const result = { ...defaults } as F;
    for (const key of Object.keys(defaults) as (keyof F)[]) {
      const raw = searchParams.get(key as string);
      if (raw === null) continue;
      const def = defaults[key];
      if (typeof def === 'boolean') {
        (result as any)[key] = raw === 'true';
      } else if (typeof def === 'number') {
        const n = Number(raw);
        if (!isNaN(n)) (result as any)[key] = n;
      } else {
        (result as any)[key] = raw;
      }
    }
    return result;
  }, [searchParams, defaults]);

  const sort = useMemo<SortState>(() => {
    const field = searchParams.get('sortField') ?? sortDefaults.field;
    const dir = (searchParams.get('sortDir') as 'asc' | 'desc') ?? sortDefaults.dir;
    return { field, dir };
  }, [searchParams, sortDefaults]);

  // ── write ─────────────────────────────────────────────────────────────────

  const setFilter = useCallback(
    (key: keyof F, value: Primitive) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const def = defaults[key];
          // Remove param when value equals default (keeps URLs clean)
          if (value === undefined || value === def) {
            next.delete(key as string);
          } else {
            next.set(key as string, String(value));
          }
          // Reset cursor on filter change
          next.delete('after');
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams, defaults]
  );

  const setSort = useCallback(
    (field: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const currentField = next.get('sortField') ?? sortDefaults.field;
          const currentDir = (next.get('sortDir') as 'asc' | 'desc') ?? sortDefaults.dir;
          if (currentField === field) {
            next.set('sortDir', currentDir === 'asc' ? 'desc' : 'asc');
          } else {
            next.set('sortField', field);
            next.set('sortDir', 'asc');
          }
          next.delete('after');
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams, sortDefaults]
  );

  const resetFilters = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const key of Object.keys(defaults)) {
          next.delete(key);
        }
        next.delete('sortField');
        next.delete('sortDir');
        next.delete('after');
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams, defaults]);

  // Count how many filters differ from defaults (for badge)
  const activeCount = useMemo(() => {
    return (Object.keys(defaults) as (keyof F)[]).filter((k) => {
      return filters[k] !== defaults[k];
    }).length;
  }, [filters, defaults]);

  return { filters, sort, setFilter, setSort, resetFilters, activeCount };
}
