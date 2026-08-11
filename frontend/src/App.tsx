import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Import Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CRM from './pages/CRM';
import CustomerDetails from './pages/CustomerDetails';
import Inventory from './pages/Inventory';
import Challans from './pages/Challans';
import ChallanBuilder from './pages/ChallanBuilder';

// Import Styles
import './styles/theme.css';
import './styles/layout.css';

// Import Layout Components
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import CommandPalette from './components/CommandPalette';

// Protected Route Guard Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Authenticating session...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// App Layout Wrapper
const AppLayout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Helper to resolve title from pathname
  const getPageTitle = (pathname: string) => {
    if (pathname === '/') return 'Operational Control Dashboard';
    if (pathname.startsWith('/crm/')) return 'Customer Timelines & CRM Detail';
    if (pathname === '/crm') return 'CRM Sales Pipeline & Customers';
    if (pathname === '/inventory') return 'Real-time Stock Inventory Logs';
    if (pathname === '/challans/new') return 'Challan Invoice Creator';
    if (pathname === '/challans') return 'Commercial Sales Challans Database';
    return 'Operations Management';
  };

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-wrapper">
        <Navbar title={getPageTitle(location.pathname)} />
        <section className="content-body">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            
            {/* CRM: Admin, Sales, Accounts */}
            <Route path="/crm" element={
              <ProtectedRoute allowedRoles={['Admin', 'Sales', 'Accounts']}>
                <CRM />
              </ProtectedRoute>
            } />
            <Route path="/crm/:id" element={
              <ProtectedRoute allowedRoles={['Admin', 'Sales', 'Accounts']}>
                <CustomerDetails />
              </ProtectedRoute>
            } />

            {/* Inventory: All can view, roles validated inside */}
            <Route path="/inventory" element={<Inventory />} />

            {/* Challans: All can view, builder limited to Sales/Admin */}
            <Route path="/challans" element={<Challans />} />
            <Route path="/challans/new" element={
              <ProtectedRoute allowedRoles={['Admin', 'Sales']}>
                <ChallanBuilder />
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </section>
      </main>
      <CommandPalette />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <AppLayout />
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
