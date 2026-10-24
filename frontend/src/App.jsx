import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import ProtectedRoute from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CompanyProfilePage from './pages/CompanyProfilePage';
import MaterialCatalogPage from './pages/MaterialCatalogPage';
import MarketplacePage from './pages/MarketplacePage';
import OrdersPage from './pages/OrdersPage';
import InventoryPage from './pages/InventoryPage';
import TradeHistoryPage from './pages/TradeHistoryPage';
import SubscriptionPage from './pages/SubscriptionPage';
import AdminVerificationPage from './pages/AdminVerificationPage';
import ErrorPage from './pages/ErrorPage';

function App() {
  const location = useLocation();
  const hideNavbar = ['/login', '/register', '/error'].includes(location.pathname);

  return (
    <ErrorBoundary>
      <div className="scrappy-app-layout">
        {!hideNavbar && <Navbar />}
        <main className={hideNavbar ? 'scrappy-auth-layout' : 'scrappy-main-content'}>
          <div className={hideNavbar ? 'scrappy-auth-inner' : 'scrappy-content-inner'}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/error" element={<ErrorPage />} />

              {/* Protected routes for all authenticated enterprise accounts */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/marketplace" element={<MarketplacePage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/trades" element={<TradeHistoryPage />} />
                <Route path="/materials" element={<MaterialCatalogPage />} />
                <Route path="/subscription" element={<SubscriptionPage />} />
                <Route path="/profile" element={<CompanyProfilePage />} />
                <Route path="/admin/verifications" element={<AdminVerificationPage />} />
              </Route>

              {/* Catch-all: redirect to dashboard if authenticated, or show ErrorPage */}
              <Route
                path="*"
                element={<ErrorPage message="Page not found. The requested URL does not exist." />}
              />
            </Routes>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
