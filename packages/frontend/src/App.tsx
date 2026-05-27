import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Dashboard } from '@/pages/Dashboard';
import { Network } from '@/pages/Network';
import { Accounts } from '@/pages/Accounts';
import { Transactions } from '@/pages/Transactions';
import { Assets } from '@/pages/Assets';
import { AccountDetail } from '@/pages/AccountDetail';
import { TransactionDetail } from '@/pages/TransactionDetail';
import { NotFound } from '@/pages/NotFound';
import { Ledgers } from './pages/Ledgers';
import { SearchPage } from './pages/Search';
import { Login } from './pages/Login';

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected routes - require authentication */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="network" element={<Network />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="accounts/:accountId" element={<AccountDetail />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="transactions/:hash" element={<TransactionDetail />} />
        <Route path="ledgers" element={<Ledgers />} />
        <Route path="assets" element={<Assets />} />
        <Route path="search" element={<SearchPage />} />
      </Route>

      {/* 404 - Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
