import { useQuery } from '@apollo/client';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TRANSACTIONS_QUERY } from '@/graphql/queries';

export function RecentTransactions() {
  const { data, loading, error } = useQuery(TRANSACTIONS_QUERY, {
    variables: { first: 10 },
    pollInterval: 5000,
  });

  if (loading) {
    return (
      <div
        className="h-80 bg-muted/30 animate-pulse rounded-lg"
        role="status"
        aria-label="Loading recent transactions"
        aria-busy="true"
      />
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="p-4 text-destructive bg-destructive/10 rounded-lg"
      >
        Failed to load transactions: {error.message}
      </div>
    );
  }

  const transactions = data?.transactions?.edges || [];

  return (
    <section aria-labelledby="recent-tx-heading" className="chart-container overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h2 id="recent-tx-heading" className="text-lg font-semibold">
          Recent Transactions
        </h2>
        <Link
          to="/transactions"
          className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 font-medium"
          aria-label="View all transactions"
        >
          View all <ExternalLink size={14} aria-hidden="true" />
        </Link>
      </div>

      <div className="overflow-x-auto -mx-6" role="region" aria-label="Recent transactions table">
        <table
          className="w-full text-left border-collapse min-w-[600px]"
          aria-label="Recent transactions"
        >
          <thead>
            <tr className="text-muted-foreground text-xs uppercase tracking-wider border-b border-border bg-muted/30">
              <th scope="col" className="px-6 py-3 font-semibold">Status</th>
              <th scope="col" className="px-6 py-3 font-semibold">Hash</th>
              <th scope="col" className="px-6 py-3 font-semibold">Ledger</th>
              <th scope="col" className="px-6 py-3 font-semibold">Source</th>
              <th scope="col" className="px-6 py-3 font-semibold text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transactions.map(({ node: tx }: any) => (
              <tr key={tx.hash} className="hover:bg-muted/50 transition-colors group">
                <td className="px-6 py-4">
                  {tx.successful ? (
                    <CheckCircle2
                      className="h-5 w-5 text-green-500"
                      aria-label="Successful"
                    />
                  ) : (
                    <XCircle
                      className="h-5 w-5 text-red-500"
                      aria-label="Failed"
                    />
                  )}
                </td>
                <td className="px-6 py-4 font-mono text-sm">
                  <Link
                    to={`/transactions/${tx.hash}`}
                    className="text-primary hover:underline truncate w-32 block"
                    aria-label={`Transaction ${tx.hash}`}
                  >
                    {tx.hash.substring(0, 12)}...
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm font-medium">{tx.ledger}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  <span aria-label={`Source account ${tx.sourceAccount}`}>
                    {tx.sourceAccount.substring(0, 4)}...{tx.sourceAccount.substring(52)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground text-right whitespace-nowrap">
                  <time dateTime={tx.createdAt}>
                    {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                  </time>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
