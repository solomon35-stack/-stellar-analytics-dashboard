/**
 * Issue #26 – Add Foreign Key Constraints
 *
 * Adds foreign key constraints with ON DELETE CASCADE to enforce referential integrity.
 *
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.sql(`
-- Issue #26 – Add foreign key constraints to enforce referential integrity

-- Add ON DELETE CASCADE for transactions.ledger_sequence
-- First drop existing constraint if it exists, then recreate with CASCADE
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_ledger_sequence_fkey;

ALTER TABLE transactions 
ADD CONSTRAINT transactions_ledger_sequence_fkey 
FOREIGN KEY (ledger_sequence) REFERENCES ledgers(sequence) ON DELETE CASCADE;

-- Ensure operations.transaction_hash has CASCADE
-- (it already references transactions(hash))
ALTER TABLE operations 
DROP CONSTRAINT IF EXISTS operations_transaction_hash_fkey;

ALTER TABLE operations 
ADD CONSTRAINT operations_transaction_hash_fkey 
FOREIGN KEY (transaction_hash) REFERENCES transactions(hash) ON DELETE CASCADE;

-- Add ON DELETE CASCADE for operations.ledger_sequence
ALTER TABLE operations 
DROP CONSTRAINT IF EXISTS operations_ledger_sequence_fkey;

ALTER TABLE operations 
ADD CONSTRAINT operations_ledger_sequence_fkey 
FOREIGN KEY (ledger_sequence) REFERENCES ledgers(sequence) ON DELETE CASCADE;

-- Add status column to track constraint validation results
-- This helps with testing and monitoring constraint enforcement
COMMENT ON CONSTRAINT transactions_ledger_sequence_fkey IS 'Ensures transaction references valid ledger; cascades on ledger delete';
COMMENT ON CONSTRAINT operations_transaction_hash_fkey IS 'Ensures operation references valid transaction; cascades on transaction delete';
COMMENT ON CONSTRAINT operations_ledger_sequence_fkey IS 'Ensures operation references valid ledger; cascades on ledger delete';
`);
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.sql(`
-- Revert to non-CASCADE constraints (original state)
ALTER TABLE operations 
DROP CONSTRAINT IF EXISTS operations_ledger_sequence_fkey;

ALTER TABLE operations 
ADD CONSTRAINT operations_ledger_sequence_fkey 
FOREIGN KEY (ledger_sequence) REFERENCES ledgers(sequence);

ALTER TABLE operations 
DROP CONSTRAINT IF EXISTS operations_transaction_hash_fkey;

ALTER TABLE operations 
ADD CONSTRAINT operations_transaction_hash_fkey 
FOREIGN KEY (transaction_hash) REFERENCES transactions(hash);

ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_ledger_sequence_fkey;

ALTER TABLE transactions 
ADD CONSTRAINT transactions_ledger_sequence_fkey 
FOREIGN KEY (ledger_sequence) REFERENCES ledgers(sequence);
`);
};