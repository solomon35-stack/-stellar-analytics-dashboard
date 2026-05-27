import { GraphQLResolveInfo } from 'graphql';
import { db } from '../database/connection';
import { mapOperation, mapTransaction } from '../utils/mappers';
import type { ApiLoaders } from '../loaders';

interface ResolverContext {
  loaders: ApiLoaders;
}

export const transactionResolvers = {
  Query: {
    transactions: async (
      parent: unknown,
      args: {
        pagination?: { first?: number; after?: string; last?: number; before?: string };
        timeRange?: { startTime?: string; endTime?: string };
        filter?: {
          successful?: boolean;
          minFee?: number;
          maxFee?: number;
          hasMemo?: boolean;
          memoType?: string;
        };
      },
      _context: ResolverContext,
      _info: GraphQLResolveInfo
    ) => {
      const { first = 20, after, before } = args.pagination || {};
      const { startTime, endTime } = args.timeRange || {};
      const { successful, minFee, maxFee, hasMemo, memoType } = args.filter || {};

      let whereClause = 'WHERE 1=1';
      const params: unknown[] = [];
      let paramIndex = 1;

      if (startTime) {
        whereClause += ` AND created_at >= $${paramIndex++}`;
        params.push(startTime);
      }
      if (endTime) {
        whereClause += ` AND created_at <= $${paramIndex++}`;
        params.push(endTime);
      }
      if (successful !== undefined) {
        whereClause += ` AND successful = $${paramIndex++}`;
        params.push(successful);
      }
      if (minFee) {
        whereClause += ` AND fee_charged >= $${paramIndex++}`;
        params.push(minFee);
      }
      if (maxFee) {
        whereClause += ` AND fee_charged <= $${paramIndex++}`;
        params.push(maxFee);
      }
      if (hasMemo !== undefined) {
        whereClause += ` AND memo_type ${hasMemo ? '!=' : '='} $${paramIndex++}`;
        params.push('none');
      }
      if (memoType) {
        whereClause += ` AND memo_type = $${paramIndex++}`;
        params.push(memoType);
      }

      let cursorClause = '';
      if (after) {
        cursorClause = ` AND created_at < $${paramIndex++}`;
        params.push(after);
      } else if (before) {
        cursorClause = ` AND created_at > $${paramIndex++}`;
        params.push(before);
      }

      const limit = Math.min(first || 20, 100);
      const orderBy = after || !before ? 'ORDER BY created_at DESC' : 'ORDER BY created_at ASC';

      const query = `
        SELECT 
          id, paging_token, successful, hash, ledger_sequence, created_at,
          source_account, source_account_sequence, fee_account, fee_charged,
          max_fee, operation_count, envelope_xdr, result_xdr, result_meta_xdr,
          fee_meta_xdr, memo_type, memo, signatures, valid_after, valid_before,
          fee_bump_transaction, inner_transaction_hash, inner_transaction_signatures
        FROM transactions 
        ${whereClause}
        ${cursorClause}
        ${orderBy}
        LIMIT $${paramIndex}
      `;
      params.push(limit);

      const transactions = await db.query(query, params);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM transactions 
        ${whereClause}
      `;
      const countResult = await db.queryOne<{ total: string }>(countQuery, params.slice(0, -1));
      const totalCount = parseInt(countResult?.total ?? '0', 10);

      const edges = transactions.map((tx) => ({
        cursor: tx.paging_token,
        node: mapTransaction(tx),
      }));

      const startCursor = edges.length > 0 ? edges[0].cursor : null;
      const endCursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;

      return {
        edges,
        pageInfo: {
          hasNextPage: edges.length === limit,
          hasPreviousPage: Boolean(after),
          startCursor,
          endCursor,
        },
        totalCount,
      };
    },

    transaction: async (
      parent: unknown,
      args: { hash: string },
      context: ResolverContext,
      _info: GraphQLResolveInfo
    ) => {
      const transaction = await context.loaders.transactionLoader.load(args.hash);
      return transaction ? mapTransaction(transaction) : null;
    },
  },

  Transaction: {
    operations: async (
      parent: { hash: string },
      _args: unknown,
      context: ResolverContext,
      _info: GraphQLResolveInfo
    ) => {
      const operations = await context.loaders.transactionOperationsLoader.load(parent.hash);
      return operations.map((op) => mapOperation(op));
    },
  },
};
