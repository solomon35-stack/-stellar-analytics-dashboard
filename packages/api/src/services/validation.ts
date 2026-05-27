import { GraphQLError } from 'graphql';
import { z } from 'zod';

const CursorSchema = z.string().min(1);
const AddressSchema = z.string().min(1).regex(/^G[A-Z0-9]{55}$/);
const HashSchema = z.string().min(1).regex(/^[a-fA-F0-9]{64}$/);
const AssetCodeSchema = z.string().min(1).max(12);

const PaginationValidationSchema = z.object({
  first: z.number().min(1).max(100).optional(),
  after: CursorSchema.optional(),
  last: z.number().min(1).max(100).optional(),
  before: CursorSchema.optional(),
});

const TimeRangeValidationSchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.startTime && data.endTime) {
      return new Date(data.startTime) <= new Date(data.endTime);
    }
    return true;
  },
  { message: 'startTime must be before endTime' }
);

const AssetFilterValidationSchema = z.object({
  assetType: z.enum(['native', 'credit_alphanum4', 'credit_alphanum12']).optional(),
  assetCode: AssetCodeSchema.optional(),
  assetIssuer: AddressSchema.optional(),
}).refine(
  (data) => {
    if (data.assetType === 'native') {
      return !data.assetCode && !data.assetIssuer;
    }
    if (data.assetCode || data.assetIssuer) {
      return data.assetCode && data.assetIssuer;
    }
    return true;
  },
  { message: 'For non-native assets, both assetCode and assetIssuer must be provided' }
);

const AccountFilterValidationSchema = z.object({
  accountId: AddressSchema.optional(),
  minBalance: z.string().regex(/^\d+$/).optional(),
  maxBalance: z.string().regex(/^\d+$/).optional(),
  isActive: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.minBalance && data.maxBalance) {
      return parseInt(data.minBalance) <= parseInt(data.maxBalance);
    }
    return true;
  },
  { message: 'minBalance must be less than or equal to maxBalance' }
);

const TransactionFilterValidationSchema = z.object({
  successful: z.boolean().optional(),
  minFee: z.number().min(0).optional(),
  maxFee: z.number().min(0).optional(),
  hasMemo: z.boolean().optional(),
  memoType: z.enum(['none', 'text', 'id', 'hash', 'return']).optional(),
}).refine(
  (data) => {
    if (data.minFee && data.maxFee) {
      return data.minFee <= data.maxFee;
    }
    return true;
  },
  { message: 'minFee must be less than or equal to maxFee' }
);

const OperationFilterValidationSchema = z.object({
  type: z.enum([
    'create_account', 'payment', 'path_payment_strict_receive',
    'path_payment_strict_send', 'manage_sell_offer', 'manage_buy_offer',
    'create_passive_sell_offer', 'set_options', 'change_trust',
    'allow_trust', 'account_merge', 'inflation', 'manage_data',
    'bump_sequence', 'claim_claimable_balance',
    'begin_sponsoring_future_reserves', 'end_sponsoring_future_reserves',
    'revoke_sponsorship', 'clawback', 'clawback_claimable_balance',
    'set_trust_line_flags', 'liquidity_pool_deposit',
    'liquidity_pool_withdraw', 'invoke_host_function',
  ]).optional(),
  successful: z.boolean().optional(),
  sourceAccount: AddressSchema.optional(),
});

function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.errors.map(e => e.message).join(', ') };
}

export class ValidationService {
  static validatePagination(args: unknown) {
    const result = safeParse(PaginationValidationSchema, args);
    if (!result.success) {
      throw new GraphQLError(`Invalid pagination: ${result.error}`, {
        extensions: { code: 'VALIDATION_ERROR' },
      });
    }
    return result.data;
  }

  static validateTimeRange(args: unknown) {
    const result = safeParse(TimeRangeValidationSchema, args);
    if (!result.success) {
      throw new GraphQLError(`Invalid time range: ${result.error}`, {
        extensions: { code: 'VALIDATION_ERROR' },
      });
    }
    return result.data;
  }

  static validateAssetFilter(args: unknown) {
    const result = safeParse(AssetFilterValidationSchema, args);
    if (!result.success) {
      throw new GraphQLError(`Invalid asset filter: ${result.error}`, {
        extensions: { code: 'VALIDATION_ERROR' },
      });
    }
    return result.data;
  }

  static validateAccountFilter(args: unknown) {
    const result = safeParse(AccountFilterValidationSchema, args);
    if (!result.success) {
      throw new GraphQLError(`Invalid account filter: ${result.error}`, {
        extensions: { code: 'VALIDATION_ERROR' },
      });
    }
    return result.data;
  }

  static validateTransactionFilter(args: unknown) {
    const result = safeParse(TransactionFilterValidationSchema, args);
    if (!result.success) {
      throw new GraphQLError(`Invalid transaction filter: ${result.error}`, {
        extensions: { code: 'VALIDATION_ERROR' },
      });
    }
    return result.data;
  }

  static validateOperationFilter(args: unknown) {
    const result = safeParse(OperationFilterValidationSchema, args);
    if (!result.success) {
      throw new GraphQLError(`Invalid operation filter: ${result.error}`, {
        extensions: { code: 'VALIDATION_ERROR' },
      });
    }
    return result.data;
  }

  static validateAddress(address: unknown): string {
    const result = safeParse(AddressSchema, address);
    if (!result.success) {
      throw new GraphQLError(`Invalid Stellar address: ${result.error}`, {
        extensions: { code: 'VALIDATION_ERROR' },
      });
    }
    return result.data;
  }

  static validateHash(hash: unknown): string {
    const result = safeParse(HashSchema, hash);
    if (!result.success) {
      throw new GraphQLError(`Invalid hash: ${result.error}`, {
        extensions: { code: 'VALIDATION_ERROR' },
      });
    }
    return result.data;
  }
}
