import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { clsx } from 'clsx';
import type { SortState } from '@/hooks/useFilterSort';

interface SortableHeaderProps {
  label: string;
  field: string;
  sort: SortState;
  onSort: (field: string) => void;
  className?: string;
}

export function SortableHeader({ label, field, sort, onSort, className }: SortableHeaderProps) {
  const isActive = sort.field === field;

  return (
    <button
      onClick={() => onSort(field)}
      className={clsx(
        'flex items-center gap-1.5 group transition-colors hover:text-foreground',
        isActive ? 'text-foreground' : 'text-muted-foreground',
        className
      )}
    >
      <span className="text-xs uppercase tracking-wider font-semibold">{label}</span>
      <span className="shrink-0">
        {isActive ? (
          sort.dir === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5 text-primary" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-primary" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-40 group-hover:opacity-70 transition-opacity" />
        )}
      </span>
    </button>
  );
}
