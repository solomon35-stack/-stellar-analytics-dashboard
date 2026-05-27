/**
 * App root (issue #49)
 *
 * Wraps the application in ApolloProvider so every component can use
 * Apollo hooks (useQuery, useMutation, useSubscription).
 */
import { ApolloProvider } from "@apollo/client";
import { apolloClient } from "./graphql/client";
import { DashboardPage } from "./pages/DashboardPage";

export function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <DashboardPage />
    </ApolloProvider>
  );
}
