/**
 * Indexes and optimizations for API query patterns.
 *
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.sql(`
CREATE INDEX idx_transactions_successful_created_at
  ON transactions (successful, created_at DESC);

CREATE INDEX idx_transactions_source_account_created_at
  ON transactions (source_account, created_at DESC);

CREATE INDEX idx_transactions_memo_type_created_at
  ON transactions (memo_type, created_at DESC)
  WHERE memo_type IS NOT NULL AND memo_type != 'none';

CREATE INDEX idx_transactions_fee_charged_created_at
  ON transactions (fee_charged, created_at DESC)
  WHERE fee_charged > 0;

CREATE INDEX idx_operations_type_created_at
  ON operations (type, created_at DESC);

CREATE INDEX idx_operations_payment_created_at
  ON operations (created_at DESC)
  WHERE type = 'payment';

CREATE INDEX idx_operations_source_created_at
  ON operations (source_account, created_at DESC);

CREATE INDEX idx_assets_type_code_issuer
  ON assets (asset_type, asset_code, asset_issuer);

CREATE INDEX idx_account_metrics_account_timestamp_desc
  ON account_metrics (account_id, timestamp DESC);

CREATE INDEX idx_asset_metrics_asset_timestamp_desc
  ON asset_metrics (asset_id, timestamp DESC);

CREATE INDEX idx_ledgers_sequence_desc
  ON ledgers (sequence DESC);

CREATE INDEX idx_network_metrics_timestamp_desc
  ON network_metrics (timestamp DESC);
  `);
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.sql(`
DROP INDEX IF EXISTS idx_network_metrics_timestamp_desc;
DROP INDEX IF EXISTS idx_ledgers_sequence_desc;
DROP INDEX IF EXISTS idx_asset_metrics_asset_timestamp_desc;
DROP INDEX IF EXISTS idx_account_metrics_account_timestamp_desc;
DROP INDEX IF EXISTS idx_assets_type_code_issuer;
DROP INDEX IF EXISTS idx_operations_source_created_at;
DROP INDEX IF EXISTS idx_operations_payment_created_at;
DROP INDEX IF EXISTS idx_operations_type_created_at;
DROP INDEX IF EXISTS idx_transactions_fee_charged_created_at;
DROP INDEX IF EXISTS idx_transactions_memo_type_created_at;
DROP INDEX IF EXISTS idx_transactions_source_account_created_at;
DROP INDEX IF EXISTS idx_transactions_successful_created_at;
  `);
};
