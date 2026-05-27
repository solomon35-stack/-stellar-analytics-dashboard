/**
 * RealtimePublisher
 *
 * Polls the database for new ledgers and transactions and publishes them
 * to the PubSub bus so GraphQL subscriptions receive live updates.
 *
 * This runs inside the API process and bridges the gap between the
 * separate indexer process (which writes to the DB) and the WS clients.
 */
import { db } from '../database/connection';
import { pubsub, EVENTS } from '../pubsub';

export class RealtimePublisher {
  private running = false;
  private lastLedgerSequence = 0;
  private lastTransactionId = '';
  private pollIntervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(pollIntervalMs = 3000) {
    this.pollIntervalMs = pollIntervalMs;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    // Seed the high-water marks so we don't replay history on startup
    await this.seedHighWaterMarks();

    this.timer = setInterval(() => this.poll(), this.pollIntervalMs);
    console.log(`✅ RealtimePublisher started (poll every ${this.pollIntervalMs}ms)`);
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('🛑 RealtimePublisher stopped');
  }

  private async seedHighWaterMarks(): Promise<void> {
    try {
      const latestLedger = await db.queryOne<{ sequence: number }>(
        'SELECT sequence FROM ledgers ORDER BY sequence DESC LIMIT 1'
      );
      if (latestLedger) this.lastLedgerSequence = latestLedger.sequence;

      const latestTx = await db.queryOne<{ id: string }>(
        'SELECT id FROM transactions ORDER BY created_at DESC LIMIT 1'
      );
      if (latestTx) this.lastTransactionId = latestTx.id;
    } catch {
      // DB may not be ready yet — will catch up on first poll
    }
  }

  private async poll(): Promise<void> {
    if (!this.running) return;
    await Promise.allSettled([this.pollLedgers(), this.pollTransactions()]);
  }

  private async pollLedgers(): Promise<void> {
    try {
      const newLedgers = await db.query<{
        id: string;
        sequence: number;
        successful_transaction_count: number;
        failed_transaction_count: number;
        operation_count: number;
        tx_set_operation_count: number;
        closed_at: string;
        total_coins: string;
        fee_pool: string;
        base_fee_in_stroops: number;
        base_reserve_in_stroops: number;
        max_tx_set_size: number;
        protocol_version: number;
        header_xdr: string;
        created_at: string;
        updated_at: string;
      }>(
        `SELECT id, sequence, successful_transaction_count, failed_transaction_count,
                operation_count, tx_set_operation_count, closed_at, total_coins,
                fee_pool, base_fee_in_stroops, base_reserve_in_stroops,
                max_tx_set_size, protocol_version, header_xdr, created_at, updated_at
         FROM ledgers
         WHERE sequence > $1
         ORDER BY sequence ASC
         LIMIT 10`,
        [this.lastLedgerSequence]
      );

      for (const row of newLedgers) {
        const ledger = {
          id: row.id,
          sequence: row.sequence,
          successfulTransactionCount: row.successful_transaction_count,
          failedTransactionCount: row.failed_transaction_count,
          operationCount: row.operation_count,
          txSetOperationCount: row.tx_set_operation_count,
          closedAt: row.closed_at,
          totalCoins: row.total_coins,
          feePool: row.fee_pool,
          baseFeeInStroops: row.base_fee_in_stroops,
          baseReserveInStroops: row.base_reserve_in_stroops,
          maxTxSetSize: row.max_tx_set_size,
          protocolVersion: row.protocol_version,
          headerXdr: row.header_xdr,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };

        await pubsub.publish(EVENTS.LEDGER_ADDED, { ledgerAdded: ledger });
        this.lastLedgerSequence = row.sequence;
      }
    } catch (err) {
      // Silently swallow — DB may be temporarily unavailable
    }
  }

  private async pollTransactions(): Promise<void> {
    try {
      const whereClause = this.lastTransactionId
        ? `WHERE created_at > (SELECT created_at FROM transactions WHERE id = $1 LIMIT 1)`
        : `WHERE 1=1`;
      const params = this.lastTransactionId ? [this.lastTransactionId] : [];

      const newTxs = await db.query<{
        id: string;
        paging_token: string;
        successful: boolean;
        hash: string;
        ledger_sequence: number;
        created_at: string;
        source_account: string;
        source_account_sequence: string;
        fee_account: string | null;
        fee_charged: number;
        max_fee: number;
        operation_count: number;
        envelope_xdr: string;
        result_xdr: string;
        result_meta_xdr: string;
        fee_meta_xdr: string;
        memo_type: string | null;
        memo: string | null;
        signatures: string;
      }>(
        `SELECT id, paging_token, successful, hash, ledger_sequence, created_at,
                source_account, source_account_sequence, fee_account, fee_charged,
                max_fee, operation_count, envelope_xdr, result_xdr, result_meta_xdr,
                fee_meta_xdr, memo_type, memo, signatures
         FROM transactions
         ${whereClause}
         ORDER BY created_at ASC
         LIMIT 20`,
        params
      );

      for (const row of newTxs) {
        const tx = {
          id: row.id,
          pagingToken: row.paging_token,
          successful: row.successful,
          hash: row.hash,
          ledger: row.ledger_sequence,
          createdAt: row.created_at,
          sourceAccount: row.source_account,
          sourceAccountSequence: row.source_account_sequence,
          feeAccount: row.fee_account,
          feeCharged: row.fee_charged,
          maxFee: row.max_fee,
          operationCount: row.operation_count,
          envelopeXdr: row.envelope_xdr,
          resultXdr: row.result_xdr,
          resultMetaXdr: row.result_meta_xdr,
          feeMetaXdr: row.fee_meta_xdr,
          memoType: row.memo_type,
          memo: row.memo,
          signatures: row.signatures ? JSON.parse(row.signatures) : [],
          operations: [],
        };

        await pubsub.publish(EVENTS.TRANSACTION_ADDED, { transactionAdded: tx });

        // Also publish to per-account channel
        await pubsub.publish(
          `${EVENTS.TRANSACTION_ADDED}.${row.source_account}`,
          { transactionAdded: tx }
        );

        this.lastTransactionId = row.id;
      }
    } catch (err) {
      // Silently swallow
    }
  }
}
