/**
 * Issue #39 – Indexer Data Validation
 *
 * Zod schemas that validate raw Horizon API responses before any data is
 * normalised or written to the database.  Invalid records are rejected early
 * so corrupt data never reaches Postgres.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Primitive helpers
// ---------------------------------------------------------------------------

/** Stellar public-key: starts with G, 56 chars total, base-32 alphabet */
export const StellarAddressSchema = z
  .string()
  .regex(/^G[A-Z2-7]{55}$/, 'Invalid Stellar address');

/** 64-char lowercase hex hash */
export const TxHashSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{64}$/, 'Invalid transaction hash');

/** Numeric string (amounts, fees stored as strings by Horizon) */
export const NumericStringSchema = z
  .string()
  .regex(/^\d+(\.\d+)?$/, 'Expected a numeric string');

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------

export const HorizonLedgerSchema = z.object({
  id: z.string().min(1),
  paging_token: z.string().min(1),
  sequence: z.number().int().positive(),
  successful_transaction_count: z.number().int().nonnegative(),
  failed_transaction_count: z.number().int().nonnegative(),
  operation_count: z.number().int().nonnegative(),
  tx_set_operation_count: z.number().int().nonnegative(),
  closed_at: z.string().datetime({ offset: true }),
  total_coins: NumericStringSchema,
  fee_pool: NumericStringSchema,
  base_fee_in_stroops: z.number().int().nonnegative(),
  base_reserve_in_stroops: z.number().int().nonnegative(),
  max_tx_set_size: z.number().int().positive(),
  protocol_version: z.number().int().nonnegative(),
  header_xdr: z.string().min(1),
});

export type HorizonLedger = z.infer<typeof HorizonLedgerSchema>;

// ---------------------------------------------------------------------------
// Transaction
// ---------------------------------------------------------------------------

export const HorizonTransactionSchema = z.object({
  id: z.string().min(1),
  paging_token: z.string().min(1),
  successful: z.boolean(),
  hash: TxHashSchema,
  ledger: z.number().int().positive(),
  created_at: z.string().datetime({ offset: true }),
  source_account: StellarAddressSchema,
  source_account_sequence: z.string().min(1),
  fee_account: StellarAddressSchema.optional().nullable(),
  fee_charged: z.union([z.string(), z.number()]).transform(String),
  max_fee: z.union([z.string(), z.number()]).transform(String),
  operation_count: z.number().int().nonnegative(),
  envelope_xdr: z.string().min(1),
  result_xdr: z.string().min(1),
  result_meta_xdr: z.string().min(1),
  fee_meta_xdr: z.string().min(1),
  memo_type: z.string().optional().nullable(),
  memo: z.string().optional().nullable(),
  signatures: z.array(z.string()),
  valid_after: z.string().optional().nullable(),
  valid_before: z.string().optional().nullable(),
  fee_bump_transaction: z.boolean().optional().nullable(),
  inner_transaction: z
    .object({
      hash: TxHashSchema,
      signatures: z.array(z.string()),
    })
    .optional()
    .nullable(),
});

export type HorizonTransaction = z.infer<typeof HorizonTransactionSchema>;

// ---------------------------------------------------------------------------
// Operation – type-dispatched validation
// ---------------------------------------------------------------------------

const BaseOperationSchema = z.object({
  id: z.string().min(1),
  paging_token: z.string().min(1),
  transaction_hash: TxHashSchema,
  transaction_successful: z.boolean(),
  type: z.string().min(1),
  created_at: z.string().datetime({ offset: true }),
  source_account: StellarAddressSchema,
});

/** Strict schemas for operation types that carry financial data */
const StrictOperationSchemas: Record<string, z.ZodTypeAny> = {
  payment: BaseOperationSchema.extend({
    type: z.literal('payment'),
    from: StellarAddressSchema,
    to: StellarAddressSchema,
    amount: NumericStringSchema,
    asset_type: z.string().min(1),
    asset_code: z.string().optional().nullable(),
    asset_issuer: StellarAddressSchema.optional().nullable(),
  }),
  path_payment_strict_receive: BaseOperationSchema.extend({
    type: z.literal('path_payment_strict_receive'),
    from: StellarAddressSchema,
    to: StellarAddressSchema,
    amount: NumericStringSchema,
    source_amount: NumericStringSchema,
    asset_type: z.string().min(1),
    asset_code: z.string().optional().nullable(),
    asset_issuer: StellarAddressSchema.optional().nullable(),
  }),
  path_payment_strict_send: BaseOperationSchema.extend({
    type: z.literal('path_payment_strict_send'),
    from: StellarAddressSchema,
    to: StellarAddressSchema,
    amount: NumericStringSchema,
    source_amount: NumericStringSchema,
    asset_type: z.string().min(1),
    asset_code: z.string().optional().nullable(),
    asset_issuer: StellarAddressSchema.optional().nullable(),
  }),
  create_account: BaseOperationSchema.extend({
    type: z.literal('create_account'),
    account: StellarAddressSchema,
    funder: StellarAddressSchema,
    starting_balance: NumericStringSchema,
  }),
};

/** Catch-all for operation types we don't need to validate deeply */
const GenericOperationSchema = BaseOperationSchema.passthrough();

/**
 * Validate an operation: use the strict schema for known types,
 * fall back to the base schema for unknown types.
 */
export const HorizonOperationSchema = z.unknown().transform((raw, ctx) => {
  const type = (raw as any)?.type as string | undefined;
  const schema = type && StrictOperationSchemas[type]
    ? StrictOperationSchemas[type]
    : GenericOperationSchema;

  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = (result.error as any).issues ?? (result.error as any).errors ?? [];
    for (const issue of issues) {
      ctx.addIssue({ ...issue, fatal: true });
    }
    return z.NEVER;
  }
  return result.data;
}) as z.ZodType<unknown>;

export type HorizonOperation = z.infer<typeof HorizonOperationSchema>;

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export interface ValidationResult<T> {
  valid: T[];
  invalid: Array<{ index: number; error: string; raw: unknown }>;
}

/**
 * Validate an array of raw Horizon records against a Zod schema.
 * Returns separate arrays of valid and invalid items so callers can
 * decide whether to skip or abort on failures.
 */
export function validateRecords<T>(
  schema: z.ZodSchema<T>,
  records: unknown[],
  label: string,
): ValidationResult<T> {
  const valid: T[] = [];
  const invalid: Array<{ index: number; error: string; raw: unknown }> = [];

  for (let i = 0; i < records.length; i++) {
    const result = schema.safeParse(records[i]);
    if (result.success) {
      valid.push(result.data);
    } else {
      // Zod v3 uses .errors, Zod v4 uses .issues
      const issues = (result.error as any).issues ?? (result.error as any).errors ?? [];
      const error = issues.map((e: any) => `${(e.path ?? []).join('.')}: ${e.message}`).join('; ');
      invalid.push({ index: i, error, raw: records[i] });
      console.warn(`[validation] invalid ${label} at index ${i}: ${error}`);
    }
  }

  return { valid, invalid };
}

/**
 * Validate a single record; throws a descriptive error on failure.
 */
export function validateRecord<T>(schema: z.ZodSchema<T>, record: unknown, label: string): T {
  const result = schema.safeParse(record);
  if (!result.success) {
    const issues = (result.error as any).issues ?? (result.error as any).errors ?? [];
    const error = issues.map((e: any) => `${(e.path ?? []).join('.')}: ${e.message}`).join('; ');
    throw new Error(`[validation] invalid ${label}: ${error}`);
  }
  return result.data;
}
