export function mapTransaction(tx: Record<string, unknown>) {
  return {
    ...tx,
    createdAt: tx.created_at,
    sourceAccount: tx.source_account,
    sourceAccountSequence: tx.source_account_sequence,
    feeAccount: tx.fee_account,
    feeCharged: tx.fee_charged,
    maxFee: tx.max_fee,
    operationCount: tx.operation_count,
    envelopeXdr: tx.envelope_xdr,
    resultXdr: tx.result_xdr,
    resultMetaXdr: tx.result_meta_xdr,
    feeMetaXdr: tx.fee_meta_xdr,
    memoType: tx.memo_type,
    validAfter: tx.valid_after,
    validBefore: tx.valid_before,
    feeBumpTransaction: tx.fee_bump_transaction,
    innerTransactionHash: tx.inner_transaction_hash,
    innerTransactionSignatures: tx.inner_transaction_signatures,
  };
}

export function mapOperation(op: Record<string, unknown>) {
  return {
    ...op,
    createdAt: op.created_at,
    transactionHash: op.transaction_hash,
    transactionSuccessful: op.transaction_successful,
    sourceAccount: op.source_account,
    ledgerSequence: op.ledger_sequence,
    operationIndex: op.operation_index,
  };
}

export function mapLedger(ledger: Record<string, unknown>) {
  return {
    ...ledger,
    closedAt: ledger.closed_at,
    successfulTransactionCount: ledger.successful_transaction_count,
    failedTransactionCount: ledger.failed_transaction_count,
    operationCount: ledger.operation_count,
    txSetOperationCount: ledger.tx_set_operation_count,
    totalCoins: ledger.total_coins,
    feePool: ledger.fee_pool,
    baseFeeInStroops: ledger.base_fee_in_stroops,
    baseReserveInStroops: ledger.base_reserve_in_stroops,
    maxTxSetSize: ledger.max_tx_set_size,
    protocolVersion: ledger.protocol_version,
    headerXdr: ledger.header_xdr,
    createdAt: ledger.created_at,
    updatedAt: ledger.updated_at,
  };
}
