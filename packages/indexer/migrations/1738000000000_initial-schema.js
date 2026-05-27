/**
 * Initial schema migration.
 * Replaces ad-hoc schema.sql execution with versioned, reversible migrations.
 *
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.sql(`
-- Ledgers
CREATE TABLE ledgers (
    id VARCHAR(64) PRIMARY KEY,
    sequence INTEGER UNIQUE NOT NULL,
    successful_transaction_count INTEGER NOT NULL DEFAULT 0,
    failed_transaction_count INTEGER NOT NULL DEFAULT 0,
    operation_count INTEGER NOT NULL DEFAULT 0,
    tx_set_operation_count INTEGER NOT NULL DEFAULT 0,
    closed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    total_coins VARCHAR(32) NOT NULL,
    fee_pool VARCHAR(32) NOT NULL,
    base_fee_in_stroops INTEGER NOT NULL DEFAULT 100,
    base_reserve_in_stroops INTEGER NOT NULL DEFAULT 5000000,
    max_tx_set_size INTEGER NOT NULL DEFAULT 100,
    protocol_version INTEGER NOT NULL DEFAULT 0,
    header_xdr TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions
CREATE TABLE transactions (
    id VARCHAR(64) PRIMARY KEY,
    paging_token VARCHAR(64) UNIQUE NOT NULL,
    successful BOOLEAN NOT NULL,
    hash VARCHAR(64) UNIQUE NOT NULL,
    ledger_sequence INTEGER NOT NULL REFERENCES ledgers(sequence),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    source_account VARCHAR(56) NOT NULL,
    source_account_sequence VARCHAR(20) NOT NULL,
    fee_account VARCHAR(56),
    fee_charged INTEGER NOT NULL DEFAULT 0,
    max_fee INTEGER NOT NULL DEFAULT 0,
    operation_count INTEGER NOT NULL DEFAULT 0,
    envelope_xdr TEXT NOT NULL,
    result_xdr TEXT NOT NULL,
    result_meta_xdr TEXT NOT NULL,
    fee_meta_xdr TEXT NOT NULL,
    memo_type VARCHAR(16) DEFAULT 'none',
    memo TEXT,
    signatures JSONB NOT NULL DEFAULT '[]',
    valid_after TIMESTAMP WITH TIME ZONE,
    valid_before TIMESTAMP WITH TIME ZONE,
    fee_bump_transaction BOOLEAN DEFAULT FALSE,
    inner_transaction_hash VARCHAR(64),
    inner_transaction_signatures JSONB DEFAULT '[]',
    row_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Operations
CREATE TABLE operations (
    id VARCHAR(64) PRIMARY KEY,
    paging_token VARCHAR(64) UNIQUE NOT NULL,
    transaction_hash VARCHAR(64) NOT NULL REFERENCES transactions(hash),
    transaction_successful BOOLEAN NOT NULL,
    type VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    source_account VARCHAR(56) NOT NULL,
    ledger_sequence INTEGER NOT NULL REFERENCES ledgers(sequence),
    operation_index INTEGER NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    row_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Accounts
CREATE TABLE accounts (
    account_id VARCHAR(56) PRIMARY KEY,
    balance VARCHAR(32) NOT NULL DEFAULT '0',
    asset_type VARCHAR(20) NOT NULL DEFAULT 'native',
    asset_code VARCHAR(12),
    asset_issuer VARCHAR(56),
    buying_liabilities VARCHAR(32) NOT NULL DEFAULT '0',
    selling_liabilities VARCHAR(32) NOT NULL DEFAULT '0',
    last_modified_ledger INTEGER NOT NULL,
    is_authorized BOOLEAN DEFAULT TRUE,
    is_authorized_to_maintain_liabilities BOOLEAN DEFAULT TRUE,
    is_clawback_enabled BOOLEAN DEFAULT FALSE,
    sequence_number VARCHAR(20) NOT NULL,
    num_subentries INTEGER NOT NULL DEFAULT 0,
    thresholds JSONB NOT NULL DEFAULT '{"low_threshold": 0, "med_threshold": 0, "high_threshold": 0}',
    flags JSONB NOT NULL DEFAULT '{"auth_required": false, "auth_revocable": false, "auth_immutable": false}',
    signers JSONB NOT NULL DEFAULT '{"signers": []}',
    data JSONB NOT NULL DEFAULT '{}',
    sponsor VARCHAR(56),
    num_sponsored INTEGER NOT NULL DEFAULT 0,
    num_sponsoring INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assets
CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    asset_type VARCHAR(20) NOT NULL,
    asset_code VARCHAR(12),
    asset_issuer VARCHAR(56),
    native BOOLEAN DEFAULT FALSE,
    UNIQUE(asset_type, asset_code, asset_issuer)
);

-- Trustlines
CREATE TABLE trustlines (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(56) NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    balance VARCHAR(32) NOT NULL DEFAULT '0',
    limit VARCHAR(32) NOT NULL DEFAULT '0',
    buying_liabilities VARCHAR(32) NOT NULL DEFAULT '0',
    selling_liabilities VARCHAR(32) NOT NULL DEFAULT '0',
    is_authorized BOOLEAN DEFAULT TRUE,
    is_authorized_to_maintain_liabilities BOOLEAN DEFAULT TRUE,
    is_clawback_enabled BOOLEAN DEFAULT FALSE,
    last_modified_ledger INTEGER NOT NULL,
    sponsor VARCHAR(56),
    UNIQUE(account_id, asset_id)
);

-- Network metrics
CREATE TABLE network_metrics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    ledger_count INTEGER NOT NULL DEFAULT 0,
    transaction_count INTEGER NOT NULL DEFAULT 0,
    operation_count INTEGER NOT NULL DEFAULT 0,
    active_accounts INTEGER NOT NULL DEFAULT 0,
    total_volume VARCHAR(32) NOT NULL DEFAULT '0',
    average_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    success_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asset metrics
CREATE TABLE asset_metrics (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    volume_24h VARCHAR(32) NOT NULL DEFAULT '0',
    volume_7d VARCHAR(32) NOT NULL DEFAULT '0',
    volume_30d VARCHAR(32) NOT NULL DEFAULT '0',
    trades_24h INTEGER NOT NULL DEFAULT 0,
    trades_7d INTEGER NOT NULL DEFAULT 0,
    trades_30d INTEGER NOT NULL DEFAULT 0,
    price_change_24h DECIMAL(10,4) NOT NULL DEFAULT 0,
    market_cap VARCHAR(32),
    holders INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(asset_id, timestamp)
);

-- Account metrics
CREATE TABLE account_metrics (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(56) NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    balance_native VARCHAR(32) NOT NULL DEFAULT '0',
    total_balance_usd VARCHAR(32) NOT NULL DEFAULT '0',
    transaction_count_24h INTEGER NOT NULL DEFAULT 0,
    transaction_count_7d INTEGER NOT NULL DEFAULT 0,
    transaction_count_30d INTEGER NOT NULL DEFAULT 0,
    first_transaction TIMESTAMP WITH TIME ZONE,
    last_transaction TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT FALSE,
    trustlines INTEGER NOT NULL DEFAULT 0,
    signers INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(account_id, timestamp)
);

CREATE INDEX idx_ledgers_sequence ON ledgers(sequence);
CREATE INDEX idx_ledgers_closed_at ON ledgers(closed_at);
CREATE INDEX idx_transactions_ledger ON transactions(ledger_sequence);
CREATE INDEX idx_transactions_source ON transactions(source_account);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_operations_transaction ON operations(transaction_hash);
CREATE INDEX idx_operations_source ON operations(source_account);
CREATE INDEX idx_operations_type ON operations(type);
CREATE INDEX idx_operations_ledger ON operations(ledger_sequence);
CREATE INDEX idx_operations_created_at ON operations(created_at);
CREATE INDEX idx_accounts_last_modified ON accounts(last_modified_ledger);
CREATE INDEX idx_trustlines_account ON trustlines(account_id);
CREATE INDEX idx_trustlines_asset ON trustlines(asset_id);
CREATE INDEX idx_network_metrics_timestamp ON network_metrics(timestamp);
CREATE INDEX idx_asset_metrics_timestamp ON asset_metrics(timestamp);
CREATE INDEX idx_asset_metrics_asset ON asset_metrics(asset_id);
CREATE INDEX idx_account_metrics_timestamp ON account_metrics(timestamp);
CREATE INDEX idx_account_metrics_account ON account_metrics(account_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ledgers_updated_at BEFORE UPDATE ON ledgers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operations_updated_at BEFORE UPDATE ON operations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.sql(`
DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
DROP TRIGGER IF EXISTS update_operations_updated_at ON operations;
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
DROP TRIGGER IF EXISTS update_ledgers_updated_at ON ledgers;
DROP FUNCTION IF EXISTS update_updated_at_column();

DROP TABLE IF EXISTS account_metrics;
DROP TABLE IF EXISTS asset_metrics;
DROP TABLE IF EXISTS network_metrics;
DROP TABLE IF EXISTS trustlines;
DROP TABLE IF EXISTS assets;
DROP TABLE IF EXISTS operations;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS ledgers;
  `);
};
