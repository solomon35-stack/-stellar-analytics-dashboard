/**
 * Frontend validation schemas using Zod.
 * Mirrors server-side validation from packages/shared/src/utils/validation.ts
 * but tailored for form UX (string-based inputs, friendly messages).
 */
import { z } from 'zod';

// ── Stellar primitives ────────────────────────────────────────────────────────

/** Stellar account ID: starts with G, 56 chars total, base32 alphabet */
export const stellarAddressSchema = z
  .string()
  .min(1, 'Account ID is required')
  .regex(/^G[A-Z2-7]{55}$/, 'Must be a valid Stellar account ID (starts with G, 56 chars)');

/** Transaction hash: 64 hex characters */
export const txHashSchema = z
  .string()
  .min(1, 'Transaction hash is required')
  .regex(/^[a-fA-F0-9]{64}$/, 'Must be a 64-character hex transaction hash');

/** Ledger sequence: positive integer */
export const ledgerSequenceSchema = z
  .string()
  .min(1, 'Ledger sequence is required')
  .regex(/^\d+$/, 'Must be a positive integer')
  .refine((v) => parseInt(v) > 0, 'Must be greater than 0');

// ── Search ────────────────────────────────────────────────────────────────────

/**
 * Global / page search query.
 * Accepts account IDs, tx hashes, ledger sequences, or general text (≥2 chars).
 */
export const searchQuerySchema = z
  .string()
  .min(2, 'Enter at least 2 characters')
  .max(200, 'Query is too long');

// ── Numeric range helpers ─────────────────────────────────────────────────────

/** Optional non-negative number stored as a string (from <input type="number">) */
const optionalNonNegativeStr = z
  .string()
  .optional()
  .refine((v) => !v || /^\d*\.?\d+$/.test(v), 'Must be a non-negative number')
  .refine((v) => !v || parseFloat(v) >= 0, 'Must be ≥ 0');

/** Optional positive integer stored as a string */
const optionalPositiveIntStr = z
  .string()
  .optional()
  .refine((v) => !v || /^\d+$/.test(v), 'Must be a whole number')
  .refine((v) => !v || parseInt(v) >= 0, 'Must be ≥ 0');

// ── Account filters ───────────────────────────────────────────────────────────

export const accountFiltersSchema = z
  .object({
    search: z
      .string()
      .optional()
      .refine(
        (v) => !v || v.length < 2 || /^G[A-Z2-7]{0,55}$/.test(v),
        'Must be a valid Stellar account ID prefix (starts with G)'
      ),
    minBalance: optionalNonNegativeStr,
    maxBalance: optionalNonNegativeStr,
    isActive: z.enum(['', 'true', 'false']).optional(),
  })
  .refine(
    (d) => {
      if (d.minBalance && d.maxBalance) {
        return parseFloat(d.minBalance) <= parseFloat(d.maxBalance);
      }
      return true;
    },
    { message: 'Min balance must be ≤ max balance', path: ['maxBalance'] }
  );

export type AccountFiltersValues = z.infer<typeof accountFiltersSchema>;

// ── Transaction filters ───────────────────────────────────────────────────────

export const transactionFiltersSchema = z
  .object({
    search: z.string().optional(),
    successful: z.enum(['', 'true', 'false']).optional(),
    hasMemo: z.enum(['', 'true', 'false']).optional(),
    memoType: z.string().optional(),
    minFee: optionalPositiveIntStr,
    maxFee: optionalPositiveIntStr,
    startTime: z.string().optional(),
    endTime: z.string().optional(),
  })
  .refine(
    (d) => {
      if (d.minFee && d.maxFee) return parseInt(d.minFee) <= parseInt(d.maxFee);
      return true;
    },
    { message: 'Min fee must be ≤ max fee', path: ['maxFee'] }
  )
  .refine(
    (d) => {
      if (d.startTime && d.endTime) return new Date(d.startTime) <= new Date(d.endTime);
      return true;
    },
    { message: 'Start time must be before end time', path: ['endTime'] }
  );

export type TransactionFiltersValues = z.infer<typeof transactionFiltersSchema>;

// ── Ledger filters ────────────────────────────────────────────────────────────

export const ledgerFiltersSchema = z
  .object({
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    minOps: optionalPositiveIntStr,
    maxOps: optionalPositiveIntStr,
  })
  .refine(
    (d) => {
      if (d.minOps && d.maxOps) return parseInt(d.minOps) <= parseInt(d.maxOps);
      return true;
    },
    { message: 'Min ops must be ≤ max ops', path: ['maxOps'] }
  )
  .refine(
    (d) => {
      if (d.startTime && d.endTime) return new Date(d.startTime) <= new Date(d.endTime);
      return true;
    },
    { message: 'Start time must be before end time', path: ['endTime'] }
  );

export type LedgerFiltersValues = z.infer<typeof ledgerFiltersSchema>;

// ── Asset filters ─────────────────────────────────────────────────────────────

export const assetFiltersSchema = z
  .object({
    search: z.string().optional(),
    assetType: z.enum(['', 'native', 'credit_alphanum4', 'credit_alphanum12']).optional(),
    minVolume: optionalNonNegativeStr,
    maxVolume: optionalNonNegativeStr,
    minHolders: optionalPositiveIntStr,
  })
  .refine(
    (d) => {
      if (d.minVolume && d.maxVolume) return parseFloat(d.minVolume) <= parseFloat(d.maxVolume);
      return true;
    },
    { message: 'Min volume must be ≤ max volume', path: ['maxVolume'] }
  );

export type AssetFiltersValues = z.infer<typeof assetFiltersSchema>;

// ── Search page filters ───────────────────────────────────────────────────────

export const searchPageFiltersSchema = z.object({
  query: searchQuerySchema,
  minBalance: optionalNonNegativeStr,
  maxBalance: optionalNonNegativeStr,
});

export type SearchPageFiltersValues = z.infer<typeof searchPageFiltersSchema>;

// ── Utility ───────────────────────────────────────────────────────────────────

/**
 * Detect what kind of Stellar identifier was entered.
 * Returns a hint string for display, or null if the input is too short.
 */
export function detectInputType(
  value: string
): 'account' | 'transaction' | 'ledger' | 'partial' | null {
  const v = value.trim();
  if (!v) return null;
  if (/^G[A-Z2-7]{55}$/.test(v)) return 'account';
  if (/^[a-fA-F0-9]{64}$/.test(v)) return 'transaction';
  if (/^\d+$/.test(v)) return 'ledger';
  if (v.length >= 2) return 'partial';
  return null;
}

/**
 * Returns a user-friendly hint for a search input value.
 */
export function getSearchHint(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (/^G[A-Z2-7]{55}$/.test(v)) return '✓ Valid Stellar account ID';
  if (/^[a-fA-F0-9]{64}$/.test(v)) return '✓ Valid transaction hash';
  if (/^\d+$/.test(v)) return '✓ Ledger sequence number';
  if (v.startsWith('G') && v.length < 56)
    return `Account ID — ${56 - v.length} more character${56 - v.length === 1 ? '' : 's'} needed`;
  if (/^[a-fA-F0-9]+$/.test(v) && v.length < 64)
    return `Transaction hash — ${64 - v.length} more character${64 - v.length === 1 ? '' : 's'} needed`;
  return null;
}
