import { Authenticated, Refine } from '@refinedev/core';
import { useNotificationProvider } from '@refinedev/antd';
import routerProvider from '@refinedev/react-router';
import { QueryCache, QueryClient } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider } from 'antd';
import enGB from 'antd/locale/en_GB';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router';
import { LoadingBlock } from '@/components/primitives';
import { AccessDeniedPage, LoginPage, NotFoundPage, UnavailablePage } from '@/features/auth/AuthPages';
import { AdminLayout } from '@/layouts/AdminLayout';
import { authProvider, clearIdentityCache } from '@/providers/authProvider';
import { dataProvider } from '@/providers/dataProvider';
import { ApiError } from '@/services/apiClient';
import { silveramTheme } from '@/styles/theme';
import { ErrorBoundary } from './ErrorBoundary';

// Route-level code splitting keeps the first screen small.
const OverviewPage = lazy(() => import('@/features/dashboard/OverviewPage'));
const ProductListPage = lazy(() => import('@/features/products/ProductListPage'));
const ProductFormPage = lazy(() => import('@/features/products/ProductFormPage'));
const PriceHistoryPage = lazy(() => import('@/features/products/PriceHistoryPage'));
const OrderListPage = lazy(() => import('@/features/orders/OrderListPage'));
const OrderShowPage = lazy(() => import('@/features/orders/OrderShowPage'));
const TransactionListPage = lazy(() => import('@/features/transactions/TransactionPages').then((m) => ({ default: m.TransactionListPage })));
const TransactionShowPage = lazy(() => import('@/features/transactions/TransactionPages').then((m) => ({ default: m.TransactionShowPage })));
const CodReconciliationPage = lazy(() => import('@/features/transactions/TransactionPages').then((m) => ({ default: m.CodReconciliationPage })));
const StockPage = lazy(() => import('@/features/inventory/InventoryPages').then((m) => ({ default: m.StockPage })));
const MovementsPage = lazy(() => import('@/features/inventory/InventoryPages').then((m) => ({ default: m.MovementsPage })));
const CustomerListPage = lazy(() => import('@/features/customers/CustomerPages').then((m) => ({ default: m.CustomerListPage })));
const CustomerShowPage = lazy(() => import('@/features/customers/CustomerPages').then((m) => ({ default: m.CustomerShowPage })));
const AnalyticsPage = lazy(() => import('@/features/analytics/AnalyticsPage'));
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));

/** A signed-out (401) or non-admin (403) answer to ANY request ends the session view immediately. */
const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
  queryCache: new QueryCache({
    onError: (error) => {
      if (!(error instanceof ApiError)) return;
      if (error.status === 401) { clearIdentityCache(); if (location.pathname !== '/login') location.assign('/login'); }
      else if (error.status === 403 && location.pathname !== '/access-denied') location.assign('/access-denied');
    },
  }),
});

const page = (element: React.ReactNode) => <ErrorBoundary><Suspense fallback={<LoadingBlock rows={8} />}>{element}</Suspense></ErrorBoundary>;

export default function App() {
  return (
    <BrowserRouter>
      <ConfigProvider theme={silveramTheme} locale={enGB}>
        <AntdApp>
          <Refine
            dataProvider={dataProvider}
            authProvider={authProvider}
            routerProvider={routerProvider}
            notificationProvider={useNotificationProvider}
            resources={[
              { name: 'products', list: '/products', create: '/products/create', edit: '/products/edit/:id', meta: { label: 'Products' } },
              { name: 'orders', list: '/orders', show: '/orders/show/:id', meta: { label: 'Orders' } },
              { name: 'transactions', list: '/transactions', show: '/transactions/show/:id', meta: { label: 'Transactions' } },
              { name: 'customers', list: '/customers', show: '/customers/show/:id', meta: { label: 'Customers' } },
              { name: 'inventory', list: '/inventory', meta: { label: 'Inventory' } },
              { name: 'inventory-movements', list: '/inventory/movements', meta: { label: 'Stock movements' } },
              { name: 'price-history', list: '/products/price-history', meta: { label: 'Price history' } },
            ]}
            options={{ syncWithLocation: false, warnWhenUnsavedChanges: false, disableTelemetry: true, reactQuery: { clientConfig: queryClient } }}
          >
            <ErrorBoundary>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/access-denied" element={<AccessDeniedPage />} />
                <Route path="/unavailable" element={<UnavailablePage />} />
                <Route element={<Authenticated key="admin" loading={<LoadingBlock rows={6} />}><AdminLayout /></Authenticated>}>
                  <Route index element={page(<OverviewPage />)} />
                  <Route path="products" element={<Outlet />}>
                    <Route index element={page(<ProductListPage />)} />
                    <Route path="create" element={page(<ProductFormPage mode="create" />)} />
                    <Route path="edit/:id" element={page(<ProductFormPage mode="edit" />)} />
                    <Route path="price-history" element={page(<PriceHistoryPage />)} />
                  </Route>
                  <Route path="orders" element={<Outlet />}>
                    <Route index element={page(<OrderListPage />)} />
                    <Route path="show/:id" element={page(<OrderShowPage />)} />
                  </Route>
                  <Route path="transactions" element={<Outlet />}>
                    <Route index element={page(<TransactionListPage />)} />
                    <Route path="show/:id" element={page(<TransactionShowPage />)} />
                    <Route path="cod" element={page(<CodReconciliationPage />)} />
                  </Route>
                  <Route path="inventory" element={<Outlet />}>
                    <Route index element={page(<StockPage />)} />
                    <Route path="movements" element={page(<MovementsPage />)} />
                  </Route>
                  <Route path="customers" element={<Outlet />}>
                    <Route index element={page(<CustomerListPage />)} />
                    <Route path="show/:id" element={page(<CustomerShowPage />)} />
                  </Route>
                  <Route path="analytics" element={page(<AnalyticsPage />)} />
                  <Route path="reports" element={page(<ReportsPage />)} />
                  <Route path="settings" element={page(<SettingsPage />)} />
                  <Route path="home" element={<Navigate to="/" replace />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </ErrorBoundary>
          </Refine>
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
  );
}
