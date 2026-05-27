import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { Toaster } from './components/ui/toaster'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import LoginPage from './pages/auth/LoginPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 2, gcTime: 1000 * 60 * 5 },
  },
})

const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'))
const ProductsPage = lazy(() => import('./pages/inventory/ProductsPage'))
const ProductDetailPage = lazy(() => import('./pages/inventory/ProductDetailPage'))
const StockPage = lazy(() => import('./pages/inventory/StockPage'))
const WarehousesPage = lazy(() => import('./pages/inventory/WarehousesPage'))
const PurchaseOrdersPage = lazy(() => import('./pages/purchasing/PurchaseOrdersPage'))
const PurchaseOrderDetailPage = lazy(() => import('./pages/purchasing/PurchaseOrderDetailPage'))
const SalesOrdersPage = lazy(() => import('./pages/sales/SalesOrdersPage'))
const ReturnsPage = lazy(() => import('./pages/sales/ReturnsPage'))
const ExpensesPage = lazy(() => import('./pages/finance/ExpensesPage'))
const AccountsPayablePage = lazy(() => import('./pages/finance/AccountsPayablePage'))
const AccountsReceivablePage = lazy(() => import('./pages/finance/AccountsReceivablePage'))
const ReportsPage = lazy(() => import('./pages/finance/ReportsPage'))
const MarketplaceSettingsPage = lazy(() => import('./pages/omnichannel/MarketplaceSettingsPage'))
const ShopeeSettingsPage = lazy(() => import('./pages/shopee/ShopeeSettingsPage'))
const ShopeeWebhookLogPage = lazy(() => import('./pages/shopee/ShopeeWebhookLogPage'))
const TikTokSettingsPage = lazy(() => import('./pages/tiktok/TikTokSettingsPage'))
const TikTokWebhookLogPage = lazy(() => import('./pages/tiktok/TikTokWebhookLogPage'))

const Loading = () => (
  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
    Loading...
  </div>
)

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <BrowserRouter>
            <Toaster position="top-right" richColors />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route index element={<Suspense fallback={<Loading />}><DashboardPage /></Suspense>} />
                  <Route path="inventory">
                    <Route path="products" element={<Suspense fallback={<Loading />}><ProductsPage /></Suspense>} />
                    <Route path="products/:id" element={<Suspense fallback={<Loading />}><ProductDetailPage /></Suspense>} />
                    <Route path="stock" element={<Suspense fallback={<Loading />}><StockPage /></Suspense>} />
                    <Route path="warehouses" element={<Suspense fallback={<Loading />}><WarehousesPage /></Suspense>} />
                  </Route>
                  <Route path="purchasing">
                    <Route path="orders" element={<Suspense fallback={<Loading />}><PurchaseOrdersPage /></Suspense>} />
                    <Route path="orders/:id" element={<Suspense fallback={<Loading />}><PurchaseOrderDetailPage /></Suspense>} />
                  </Route>
                  <Route path="sales">
                    <Route path="orders" element={<Suspense fallback={<Loading />}><SalesOrdersPage /></Suspense>} />
                    <Route path="returns" element={<Suspense fallback={<Loading />}><ReturnsPage /></Suspense>} />
                  </Route>
                  <Route path="finance">
                    <Route path="expenses" element={<Suspense fallback={<Loading />}><ExpensesPage /></Suspense>} />
                    <Route path="payable" element={<Suspense fallback={<Loading />}><AccountsPayablePage /></Suspense>} />
                    <Route path="receivable" element={<Suspense fallback={<Loading />}><AccountsReceivablePage /></Suspense>} />
                    <Route path="reports" element={<Suspense fallback={<Loading />}><ReportsPage /></Suspense>} />
                  </Route>
                  <Route path="omnichannel">
                    <Route path="settings" element={<Suspense fallback={<Loading />}><MarketplaceSettingsPage /></Suspense>} />
                    <Route path="shopee/settings" element={<Suspense fallback={<Loading />}><ShopeeSettingsPage /></Suspense>} />
                    <Route path="shopee/webhook-logs" element={<Suspense fallback={<Loading />}><ShopeeWebhookLogPage /></Suspense>} />
                    <Route path="tiktok/settings" element={<Suspense fallback={<Loading />}><TikTokSettingsPage /></Suspense>} />
                    <Route path="tiktok/webhook-logs" element={<Suspense fallback={<Loading />}><TikTokWebhookLogPage /></Suspense>} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
