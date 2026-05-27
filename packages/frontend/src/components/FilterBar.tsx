/**
 * FilterBar
 *
 * Reusable collapsible filter panel. Renders a trigger button showing the
 * active-filter count badge, an expandable panel with arbitrary filter
 * controls passed as children, and an optional preset row.
 */
import React, { useState } from 'react';
import { SlidersHorizontal, X, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { clsx } from 'clsx';

export interface FilterPreset {
  label: string;
  description?: string;
  apply: () => void;
}

interface FilterBarProps {
  activeCount: number;
  onReset: () => void;
  presets?: FilterPreset[];
  children: React.ReactNode;
  /** Start expanded when there are active filters */
  defaultOpen?: boolean;
}

export function FilterBar({
  activeCount,
  onReset,
  presets,
  children,
  defaultOpen = false,
}: FilterBarProps) {
  const [open, setOpen] = useState(defaultOpen || activeCount > 0);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Trigger row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className={clsx(
            'flex items-center gap-2 text-sm font-medium transition-colors',
            open ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {activeCount}
            </span>
          )}
          {open ? (
            <ChevronUp className="h-3.5 w-3.5 ml-0.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 ml-0.5" />
          )}
        </button>

        {/* Preset pills — always visible */}
        {presets && presets.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Presets:
            </span>
            {presets.map((preset) => (
              <button
                key={preset.label}
                onClick={preset.apply}
                title={preset.description}
                className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted hover:bg-accent border border-border transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}

        {/* Reset — only when filters are active */}
        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Reset
          </button>
        )}
      </div>

      {/* Expandable filter controls */}
      {open && (
        <div className="border-t border-border/60 px-4 py-4 bg-muted/20 animate-in fade-in slide-in-from-top-1 duration-150">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Reusable sub-components ──────────────────────────────────────────────────

interface FilterRowProps {
  label: string;
  children: React.ReactNode;
}

export function FilterRow({ label, children }: FilterRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <span className="text-xs font-semibold text-muted-foreground w-28 shrink-0">{label}</span>
      <div className="flex items-center gap-2 flex-wrap">{children}</div>
    </div>
  );
}

interface ToggleGroupProps {
  options: { label: string; value: string | boolean | undefined }[];
  value: string | boolean | undefined;
  onChange: (v: string | boolean | undefined) => void;
}

export function ToggleGroup({ options, value, onChange }: ToggleGroupProps) {
  return (
    <div className="flex items-center gap-0.5 bg-muted/50 p-0.5 rounded-lg border border-border">
      {options.map((opt) => (
        <button
          key={String(opt.label)}
          onClick={() => onChange(opt.value)}
          className={clsx(
            'px-3 py-1 rounded-md text-xs font-medium transition-all',
            value === opt.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

interface RangeInputProps {
  minValue: string | number | undefined;
  maxValue: string | number | undefined;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
  placeholder?: { min?: string; max?: string };
  type?: 'number' | 'text';
  unit?: string;
}

export function RangeInput({
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  placeholder,
  type = 'number',
  unit,
}: RangeInputProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type={type}
        value={minValue ?? ''}
        onChange={(e) => onMinChange(e.target.value)}
        placeholder={placeholder?.min ?? 'Min'}
        className="w-28 px-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <span className="text-muted-foreground text-xs">–</span>
      <input
        type={type}
        value={maxValue ?? ''}
        onChange={(e) => onMaxChange(e.target.value)}
        placeholder={placeholder?.max ?? 'Max'}
        className="w-28 px-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
    </div>
  );
}

interface DateRangeInputProps {
  startValue: string | undefined;
  endValue: string | undefined;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
}

export function DateRangeInput({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
}: DateRangeInputProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        type="datetime-local"
        value={startValue ?? ''}
        onChange={(e) => onStartChange(e.target.value)}
        className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <span className="text-muted-foreground text-xs">to</span>
      <input
        type="datetime-local"
        value={endValue ?? ''}
        onChange={(e) => onEndChange(e.target.value)}
        className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );
}
