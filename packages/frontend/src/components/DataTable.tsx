import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { clsx } from 'clsx';
import type { SortState } from '@/hooks/useFilterSort';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
  /** If provided, clicking the header sorts by this field */
  sortField?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  /** Pass current sort state + handler to enable column sorting */
  sort?: SortState;
  onSort?: (field: string) => void;
  totalCount?: number;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  loading,
  onNextPage,
  onPrevPage,
  hasNextPage,
  hasPrevPage,
  sort,
  onSort,
  totalCount,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {columns.map((col, i) => {
                const isSortable = !!col.sortField && !!onSort;
                const isActive = sort?.field === col.sortField;

                return (
                  <th
                    key={i}
                    className={clsx(
                      'px-6 py-4',
                      isSortable && 'cursor-pointer select-none hover:bg-muted/50 transition-colors',
                      col.className
                    )}
                    onClick={isSortable ? () => onSort!(col.sortField!) : undefined}
                  >
                    <div className="flex items-center gap-1.5 group">
                      <span
                        className={clsx(
                          'text-xs uppercase tracking-wider font-semibold transition-colors',
                          isActive ? 'text-foreground' : 'text-muted-foreground',
                          isSortable && 'group-hover:text-foreground'
                        )}
                      >
                        {col.header}
                      </span>
                      {isSortable && (
                        <span className="shrink-0">
                          {isActive ? (
                            sort!.dir === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5 text-primary" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 opacity-30 group-hover:opacity-60 transition-opacity" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading
              ? [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {columns.map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-muted rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              : data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-6 py-12 text-center text-sm text-muted-foreground"
                    >
                      No results found
                    </td>
                  </tr>
                )
              : data.map((item, i) => (
                  <motion.tr
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    key={i}
                    onClick={onRowClick ? () => onRowClick(item) : undefined}
                    className={clsx(
                      'hover:bg-muted/50 transition-colors',
                      onRowClick && 'cursor-pointer'
                    )}
                  >
                    {columns.map((col, j) => (
                      <td key={j} className={clsx('px-6 py-4 text-sm', col.className)}>
                        {typeof col.accessor === 'function'
                          ? col.accessor(item)
                          : (item[col.accessor] as React.ReactNode)}
                      </td>
                    ))}
                  </motion.tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/10">
        <p className="text-sm text-muted-foreground">
          {totalCount !== undefined
            ? `Showing ${data.length} of ${totalCount.toLocaleString()}`
            : `Showing ${data.length} results`}
        </p>
        <div className="flex gap-2">
          <button
            disabled={!hasPrevPage || loading}
            onClick={onPrevPage}
            className="p-2 rounded-lg border border-border hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            disabled={!hasNextPage || loading}
            onClick={onNextPage}
            className="p-2 rounded-lg border border-border hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
