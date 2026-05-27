/**
 * Tests for Issue #39 – Indexer Data Validation
 */

import {
  HorizonLedgerSchema,
  HorizonTransactionSchema,
  HorizonOperationSchema,
  validateRecord,
  validateRecords,
} from '../validation/schemas';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validLedger = {
  id: 'abc123',
  paging_token: 'token1',
  sequence: 1000,
  successful_transaction_count: 5,
  failed_transaction_count: 1,
  operation_count: 10,
  tx_set_operation_count: 10,
  closed_at: '2024-01-01T00:00:00Z',
  total_coins: '100000000000.0000000',
  fee_pool: '1234.5678900',
  base_fee_in_stroops: 100,
  base_reserve_in_stroops: 5000000,
  max_tx_set_size: 1000,
  protocol_version: 20,
  header_xdr: 'AAAA',
};

const validTransaction = {
  id: 'txid1',
  paging_token: 'txtoken1',
  successful: true,
  hash: 'a'.repeat(64),
  ledger: 1000,
  created_at: '2024-01-01T00:00:00Z',
  source_account: 'G' + 'A'.repeat(55),
  source_account_sequence: '12345',
  fee_charged: '100',
  max_fee: '200',
  operation_count: 1,
  envelope_xdr: 'AAAA',
  result_xdr: 'AAAA',
  result_meta_xdr: 'AAAA',
  fee_meta_xdr: 'AAAA',
  signatures: ['sig1'],
};

const validPaymentOp = {
  id: 'op1',
  paging_token: 'optoken1',
  transaction_hash: 'a'.repeat(64),
  transaction_successful: true,
  type: 'payment' as const,
  created_at: '2024-01-01T00:00:00Z',
  source_account: 'G' + 'A'.repeat(55),
  from: 'G' + 'A'.repeat(55),
  to: 'G' + 'B'.repeat(55),
  amount: '100.0000000',
  asset_type: 'native',
};

// ---------------------------------------------------------------------------
// Ledger validation
// ---------------------------------------------------------------------------

describe('HorizonLedgerSchema', () => {
  it('accepts a valid ledger', () => {
    expect(() => HorizonLedgerSchema.parse(validLedger)).not.toThrow();
  });

  it('rejects a ledger with missing sequence', () => {
    const { sequence: _seq, ...noSeq } = validLedger;
    expect(() => HorizonLedgerSchema.parse(noSeq)).toThrow();
  });

  it('rejects a ledger with negative sequence', () => {
    expect(() => HorizonLedgerSchema.parse({ ...validLedger, sequence: -1 })).toThrow();
  });

  it('rejects a ledger with invalid closed_at', () => {
    expect(() =>
      HorizonLedgerSchema.parse({ ...validLedger, closed_at: 'not-a-date' }),
    ).toThrow();
  });

  it('rejects a ledger with non-numeric total_coins', () => {
    expect(() =>
      HorizonLedgerSchema.parse({ ...validLedger, total_coins: 'abc' }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Transaction validation
// ---------------------------------------------------------------------------

describe('HorizonTransactionSchema', () => {
  it('accepts a valid transaction', () => {
    expect(() => HorizonTransactionSchema.parse(validTransaction)).not.toThrow();
  });

  it('rejects a transaction with invalid hash length', () => {
    expect(() =>
      HorizonTransactionSchema.parse({ ...validTransaction, hash: 'tooshort' }),
    ).toThrow();
  });

  it('rejects a transaction with invalid source_account', () => {
    expect(() =>
      HorizonTransactionSchema.parse({ ...validTransaction, source_account: 'INVALID' }),
    ).toThrow();
  });

  it('coerces numeric fee_charged to string', () => {
    const result = HorizonTransactionSchema.parse({ ...validTransaction, fee_charged: 100 });
    expect(result.fee_charged).toBe('100');
  });
});

// ---------------------------------------------------------------------------
// Operation validation
// ---------------------------------------------------------------------------

describe('HorizonOperationSchema', () => {
  it('accepts a valid payment operation', () => {
    expect(() => HorizonOperationSchema.parse(validPaymentOp)).not.toThrow();
  });

  it('rejects a payment with invalid "to" address', () => {
    expect(() =>
      HorizonOperationSchema.parse({ ...validPaymentOp, to: 'BADADDRESS' }),
    ).toThrow();
  });

  it('rejects a payment with non-numeric amount', () => {
    expect(() =>
      HorizonOperationSchema.parse({ ...validPaymentOp, amount: 'not-a-number' }),
    ).toThrow();
  });

  it('accepts a generic (unknown) operation type', () => {
    const generic = {
      id: 'op2',
      paging_token: 'optoken2',
      transaction_hash: 'a'.repeat(64),
      transaction_successful: true,
      type: 'invoke_host_function',
      created_at: '2024-01-01T00:00:00Z',
      source_account: 'G' + 'A'.repeat(55),
    };
    expect(() => HorizonOperationSchema.parse(generic)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// validateRecords helper
// ---------------------------------------------------------------------------

describe('validateRecords', () => {
  it('separates valid and invalid records', () => {
    const records = [
      validLedger,
      { ...validLedger, sequence: -99 }, // invalid
      { ...validLedger, sequence: 1001 }, // valid
    ];

    const { valid, invalid } = validateRecords(HorizonLedgerSchema, records, 'ledger');
    expect(valid).toHaveLength(2);
    expect(invalid).toHaveLength(1);
    expect(invalid[0].index).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// validateRecord helper
// ---------------------------------------------------------------------------

describe('validateRecord', () => {
  it('returns the parsed value on success', () => {
    const result = validateRecord(HorizonLedgerSchema, validLedger, 'ledger') as { sequence: number };
    expect(result.sequence).toBe(1000);
  });

  it('throws a descriptive error on failure', () => {
    expect(() =>
      validateRecord(HorizonLedgerSchema, { ...validLedger, sequence: 'bad' }, 'ledger'),
    ).toThrow(/invalid ledger/i);
  });
});
