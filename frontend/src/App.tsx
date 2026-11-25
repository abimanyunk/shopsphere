import type { ReactNode } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { AdminRoute, ProtectedRoute } from './components/Guards';
import { AdminLayout, Layout } from './components/Layout';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import {
  AdminDashboardPage,
  AdminInventoryPage,
  AdminOrdersPage,
  AdminProductsPage,
} from './pages/AdminPages';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { HomePage } from './pages/HomePage';
import { OrderDetailPage, OrdersPage, ProfilePage } from './pages/OrderPages';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ProductsPage } from './pages/ProductsPage';

function NotFoundPage() {
  return (
    <main className="page-shell">
      <div className="empty-state">
        <span className="empty-icon">404</span>
        <h1>Page not found</h1>
        <p>The page you followed has moved or never existed.</p>
        <Link className="button button-primary" to="/">
          Return home
        </Link>
      </div>
    </main>
  );
}

const protectedPage = (node: ReactNode) => <ProtectedRoute>{node}</ProtectedRoute>;

export function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/:id" element={<ProductDetailPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="cart" element={protectedPage(<CartPage />)} />
            <Route path="checkout" element={protectedPage(<CheckoutPage />)} />
            <Route path="orders" element={protectedPage(<OrdersPage />)} />
            <Route path="orders/:id" element={protectedPage(<OrderDetailPage />)} />
            <Route
              path="orders/:id/confirmation"
              element={protectedPage(<OrderDetailPage confirmation />)}
            />
            <Route path="profile" element={protectedPage(<ProfilePage />)} />
            <Route
              path="admin"
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="inventory" element={<AdminInventoryPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </CartProvider>
    </AuthProvider>
  );
}
