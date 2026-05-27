/**
 * FilterBar — mobile-first collapsible filter panel.
 *
 * On mobile the preset pills collapse into a horizontally-scrollable strip
 * so they never wrap onto multiple lines and push content down.
 * RangeInput and DateRangeInput inputs are full-width on mobile.
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
      {/* ── Trigger row ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-3 sm:px-4 sm:gap-3">
        {/* Toggle button — 44px touch target */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Collapse filters' : 'Expand filters'}
          className={clsx(
            'flex items-center gap-2 text-sm font-medium transition-colors min-h-[44px] px-1',
            open ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Filters</span>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {activeCount}
            </span>
          )}
          {open
            ? <ChevronUp className="h-3.5 w-3.5 ml-0.5" aria-hidden="true" />
            : <ChevronDown className="h-3.5 w-3.5 ml-0.5" aria-hidden="true" />
          }
        </button>

        {/* Preset pills — horizontally scrollable on mobile, wrapping on desktop */}
        {presets && presets.length > 0 && (
          <div className="flex-1 min-w-0 overflow-x-auto">
            <div className="flex items-center gap-1.5 sm:flex-wrap pb-0.5">
              <span className="hidden sm:flex text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 items-center gap-1 shrink-0">
                <Zap className="h-3 w-3" aria-hidden="true" />
                Presets:
              </span>
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={preset.apply}
                  title={preset.description}
                  className="shrink-0 px-2.5 py-1.5 rounded-full text-xs font-medium bg-muted hover:bg-accent border border-border transition-colors min-h-[32px] whitespace-nowrap"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reset — only when filters are active */}
        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="ml-auto shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors min-h-[44px] px-1"
            aria-label="Reset all filters"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        )}
      </div>

      {/* ── Expandable filter controls ───────────────────────────────── */}
      {open && (
        <div className="border-t border-border/60 px-3 py-4 sm:px-4 bg-muted/20 animate-in fade-in slide-in-from-top-1 duration-150">
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
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-2">
      <span className="text-xs font-semibold text-muted-foreground sm:w-28 sm:shrink-0 sm:pt-1.5">
        {label}
      </span>
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
    <div className="flex items-center gap-0.5 bg-muted/50 p-0.5 rounded-lg border border-border flex-wrap">
      {options.map((opt) => (
        <button
          key={String(opt.label)}
          onClick={() => onChange(opt.value)}
          className={clsx(
            'px-3 py-1.5 rounded-md text-xs font-medium transition-all min-h-[32px]',
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
  minError?: string;
  maxError?: string;
}

export function RangeInput({
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  placeholder,
  type = 'number',
  unit,
  minError,
  maxError,
}: RangeInputProps) {
  return (
    <div className="flex flex-col gap-1 w-full sm:w-auto">
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex flex-col gap-0.5 flex-1 sm:flex-none">
          <input
            type={type}
            value={minValue ?? ''}
            onChange={(e) => onMinChange(e.target.value)}
            placeholder={placeholder?.min ?? 'Min'}
            aria-invalid={!!minError}
            className={clsx(
              'w-full sm:w-28 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 min-h-[40px]',
              minError
                ? 'border-destructive focus:ring-destructive/30'
                : 'border-border focus:ring-primary/30'
            )}
          />
          {minError && (
            <span className="text-[10px] text-destructive leading-tight">{minError}</span>
          )}
        </div>
        <span className="text-muted-foreground text-xs shrink-0">–</span>
        <div className="flex flex-col gap-0.5 flex-1 sm:flex-none">
          <input
            type={type}
            value={maxValue ?? ''}
            onChange={(e) => onMaxChange(e.target.value)}
            placeholder={placeholder?.max ?? 'Max'}
            aria-invalid={!!maxError}
            className={clsx(
              'w-full sm:w-28 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 min-h-[40px]',
              maxError
                ? 'border-destructive focus:ring-destructive/30'
                : 'border-border focus:ring-primary/30'
            )}
          />
          {maxError && (
            <span className="text-[10px] text-destructive leading-tight">{maxError}</span>
          )}
        </div>
        {unit && <span className="text-xs text-muted-foreground shrink-0">{unit}</span>}
      </div>
    </div>
  );
}

interface DateRangeInputProps {
  startValue: string | undefined;
  endValue: string | undefined;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  endError?: string;
}

export function DateRangeInput({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  endError,
}: DateRangeInputProps) {
  return (
    <div className="flex flex-col gap-1 w-full sm:w-auto">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <input
          type="datetime-local"
          value={startValue ?? ''}
          onChange={(e) => onStartChange(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[40px]"
        />
        <span className="text-muted-foreground text-xs text-center sm:text-left">to</span>
        <div className="flex flex-col gap-0.5">
          <input
            type="datetime-local"
            value={endValue ?? ''}
            onChange={(e) => onEndChange(e.target.value)}
            aria-invalid={!!endError}
            className={clsx(
              'w-full sm:w-auto px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 min-h-[40px]',
              endError
                ? 'border-destructive focus:ring-destructive/30'
                : 'border-border focus:ring-primary/30'
            )}
          />
          {endError && (
            <span className="text-[10px] text-destructive leading-tight">{endError}</span>
          )}
        </div>
      </div>
    </div>
  );
}
