/**
 * Reusable inline validation message component.
 * Shows errors (red) or hints (muted) below form inputs.
 */
import React from 'react';
import { AlertCircle, Info } from 'lucide-react';
import { clsx } from 'clsx';

interface ValidationMessageProps {
  /** Error text — shown in red with an alert icon */
  error?: string;
  /** Hint text — shown in muted color with an info icon */
  hint?: string;
  className?: string;
  /** Optional id for aria-describedby linking */
  id?: string;
}

export function ValidationMessage({ error, hint, className, id }: ValidationMessageProps) {
  if (!error && !hint) return null;

  if (error) {
    return (
      <p
        id={id}
        role="alert"
        aria-live="polite"
        className={clsx('flex items-center gap-1 text-xs text-destructive mt-1', className)}
      >
        <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
        {error}
      </p>
    );
  }

  return (
    <p
      id={id}
      aria-live="polite"
      className={clsx('flex items-center gap-1 text-xs text-muted-foreground mt-1', className)}
    >
      <Info className="h-3 w-3 shrink-0" aria-hidden="true" />
      {hint}
    </p>
  );
}
