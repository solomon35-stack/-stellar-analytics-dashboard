import { GraphQLResolveInfo } from 'graphql';
import { db, CACHE_TTL } from '../database/connection';
import { Connection, Edge, PageInfo } from '@stellar-analytics/shared';

export const ledgerResolvers = {
  Query: {
    ledgers: async (
      parent: any,
      args: {
        pagination?: { first?: number; after?: string; last?: number; before?: string };
        timeRange?: { startTime?: string; endTime?: string };
      },
      context: any,
      info: GraphQLResolveInfo
    ): Promise<Connection<any>> => {
      if (args.pagination) {
        ValidationService.validatePagination(args.pagination);
      }
      if (args.timeRange) {
        ValidationService.validateTimeRange(args.timeRange);
      }

      const { first = 20, after, last, before } = args.pagination || {};
      const { startTime, endTime } = args.timeRange || {};

      const cacheKey = `ledgers:${first}:${after || 'none'}:${before || 'none'}:${startTime || 'all'}:${endTime || 'all'}`;

      // Try cache first
      const cached = await db.cacheGet(cacheKey);
      if (cached) {
        return cached;
      }

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (startTime) {
        whereClause += ` AND closed_at >= $${paramIndex++}`;
        params.push(startTime);
      }
      if (endTime) {
        whereClause += ` AND closed_at <= $${paramIndex++}`;
        params.push(endTime);
      }

      // Handle cursor pagination
      let cursorClause = '';
      if (after) {
        cursorClause = ` AND sequence < $${paramIndex++}`;
        params.push(parseInt(after));
      } else if (before) {
        cursorClause = ` AND sequence > $${paramIndex++}`;
        params.push(parseInt(before));
      }

      const limit = Math.min(first || 20, 100);
      const orderBy = after || !before ? 'ORDER BY sequence DESC' : 'ORDER BY sequence ASC';

      const query = `
        SELECT 
          id, sequence, successful_transaction_count, failed_transaction_count,
          operation_count, tx_set_operation_count, closed_at, total_coins,
          fee_pool, base_fee_in_stroops, base_reserve_in_stroops,
          max_tx_set_size, protocol_version, header_xdr, created_at, updated_at
        FROM ledgers 
        ${whereClause}
        ${cursorClause}
        ${orderBy}
        LIMIT $${paramIndex}
      `;
      params.push(limit);

      const ledgers = await db.query(query, params);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM ledgers 
        ${whereClause}
      `;
      const countResult = await db.queryOne(countQuery, params.slice(0, -1));
      const totalCount = parseInt(countResult.total);

      // Create edges
      const edges: Edge<any>[] = ledgers.map((ledger, index) => ({
        cursor: ledger.sequence.toString(),
        node: {
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
        },
      }));

// Create page info
       const startCursor = edges.length > 0 ? edges[0].cursor : null;
       const endCursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;
       
       const hasNextPage = edges.length === limit;
       const hasPreviousPage = after ? true : false;

       const result = {
         edges,
         pageInfo: {
           hasNextPage,
           hasPreviousPage,
           startCursor,
           endCursor,
         },
         totalCount,
       };

       // Cache the result
       await db.cacheSet(cacheKey, result, CACHE_TTL.LEDGER_DATA);
       return result;
    },

    ledger: async (
      parent: any,
      args: { sequence: number },
      context: any,
      info: GraphQLResolveInfo
    ) => {
      const cacheKey = `ledger:${args.sequence}`;

      // Try cache first
      const cached = await db.cacheGet(cacheKey);
      if (cached) {
        return cached;
      }

      const ledger = await db.queryOne(
        `SELECT 
          id, sequence, successful_transaction_count, failed_transaction_count,
          operation_count, tx_set_operation_count, closed_at, total_coins,
          fee_pool, base_fee_in_stroops, base_reserve_in_stroops,
          max_tx_set_size, protocol_version, header_xdr, created_at, updated_at
        FROM ledgers WHERE sequence = $1`,
        [args.sequence]
      );

      if (!ledger) return null;

      const result = {
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

      // Cache the result
      await db.cacheSet(cacheKey, result, CACHE_TTL.LEDGER_DATA);
      return result;
    },
  },
};
