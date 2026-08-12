import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  DollarSign, 
  Users, 
  FileCheck2, 
  AlertTriangle, 
  Boxes, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight,
  ClipboardList
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';

interface DashboardData {
  kpis: {
    activeLeads: number;
    activeCustomers: number;
    draftChallans: number;
    totalRevenue: number;
    lowStockCount: number;
    totalInventoryValue: number;
  };
  recentStockLogs: Array<{
    id: string;
    productId: string;
    quantityChanged: number;
    movementType: 'IN' | 'OUT';
    reason: string;
    createdBy: string;
    createdAt: string;
    product: {
      name: string;
      sku: string;
    };
  }>;
  recentNotes: Array<{
    id: string;
    note: string;
    createdBy: string;
    createdAt: string;
    customer: {
      name: string;
      businessName: string;
    };
  }>;
  topLowStockAlerts: Array<{
    id: string;
    name: string;
    sku: string;
    currentStock: number;
    minStockAlert: number;
  }>;
  recentChallans: Array<{
    id: string;
    challanNumber: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    customer: {
      name: string;
      businessName: string;
    };
  }>;
}

const Dashboard: React.FC = () => {
  const { token, user } = useAuth();
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          throw new Error('Failed to load dashboard statistics');
        }
        const data = await response.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading dashboard insights...</div>;
  }

  if (error || !stats) {
    return <div style={{ padding: '2rem', color: 'red' }}>Error: {error || 'Could not load data'}</div>;
  }

  const { kpis, recentStockLogs, recentNotes, topLowStockAlerts, recentChallans } = stats;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    const dx = (x - xc) / xc;
    const dy = (y - yc) / yc;
    
    const maxRotate = 8;
    const rx = -dy * maxRotate;
    const ry = dx * maxRotate;
    
    card.style.setProperty('--rx', `${rx}deg`);
    card.style.setProperty('--ry', `${ry}deg`);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  };

  // KPI Ring Target Calculations
  const revenuePercent = Math.min(Math.round((kpis.totalRevenue / 500000) * 100), 100);
  const totalCust = kpis.activeCustomers + kpis.activeLeads;
  const customerPercent = totalCust > 0 ? Math.round((kpis.activeCustomers / totalCust) * 100) : 0;
  
  // Estimate total products count (Mocked total 6, or calculate based on low stock alerts)
  const totalProductsCount = 6; 
  const healthyStockPercent = Math.max(Math.round(((totalProductsCount - kpis.lowStockCount) / totalProductsCount) * 100), 0);
  const valuationPercent = Math.min(Math.round((kpis.totalInventoryValue / 2000000) * 100), 100);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* SVG Gradient definitions for progress rings */}
      <svg style={{ width: 0, height: 0, position: 'absolute' }}>
        <defs>
          <linearGradient id="ring-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <linearGradient id="ring-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>
          <linearGradient id="ring-rose" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#be123c" />
          </linearGradient>
          <linearGradient id="ring-amber" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
      </svg>

      {/* Welcome Widget */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-hover))',
        borderRadius: 'var(--radius-md)',
        padding: '1.75rem 2rem',
        color: 'white',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Welcome back, {user?.name}!</h2>
          <p style={{ opacity: 0.85, fontSize: '0.875rem' }}>
            You are logged in with <strong>{user?.role}</strong> permissions. Here is the operational state for today.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {['Admin', 'Sales'].includes(user?.role || '') && (
            <Link to="/challans/new" className="btn btn-secondary btn-sm" style={{ border: 'none', background: 'rgba(255,255,255,0.2)', color: 'white' }}>
              + Create Sales Challan
            </Link>
          )}
        </div>
      </div>

      {/* Stats KPI Widgets Grid */}
      <div className="stats-grid">
        {/* Card 1: Revenue */}
        <div className="kpi-card" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
          <div className="kpi-header">
            <span className="kpi-title">Total Sales Revenue</span>
            <div className="kpi-icon-wrapper" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="kpi-value" style={{ fontSize: '1.65rem' }}>₹{kpis.totalRevenue.toLocaleString('en-IN')}</span>
              <span className="kpi-subtitle">Sales target: ₹5L</span>
            </div>
            
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '50px', height: '50px', flexShrink: 0 }}>
              <svg width="50" height="50" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--border-color)" strokeWidth="3.5" />
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="url(#ring-emerald)" strokeWidth="3.5" strokeDasharray="100" strokeDashoffset={100 - revenuePercent} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
              </svg>
              <span style={{ position: 'absolute', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {revenuePercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Customers */}
        <div className="kpi-card" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
          <div className="kpi-header">
            <span className="kpi-title">Active Customers</span>
            <div className="kpi-icon-wrapper" style={{ background: 'var(--color-info-light)', color: 'var(--color-info)' }}>
              <Users size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="kpi-value">{kpis.activeCustomers}</span>
              <span className="kpi-subtitle">{kpis.activeLeads} active leads</span>
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '50px', height: '50px', flexShrink: 0 }}>
              <svg width="50" height="50" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--border-color)" strokeWidth="3.5" />
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="url(#ring-cyan)" strokeWidth="3.5" strokeDasharray="100" strokeDashoffset={100 - customerPercent} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
              </svg>
              <span style={{ position: 'absolute', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {customerPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Stock Shortages */}
        <div className="kpi-card" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
          <div className="kpi-header">
            <span className="kpi-title">Stock Health Alert</span>
            <div className="kpi-icon-wrapper" style={{ 
              background: kpis.lowStockCount > 0 ? 'var(--color-danger-light)' : 'var(--color-success-light)', 
              color: kpis.lowStockCount > 0 ? 'var(--color-danger)' : 'var(--color-success)' 
            }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="kpi-value">{kpis.lowStockCount} items</span>
              <span className="kpi-subtitle">Below safety stock limits</span>
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '50px', height: '50px', flexShrink: 0 }}>
              <svg width="50" height="50" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--border-color)" strokeWidth="3.5" />
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="url(#ring-rose)" strokeWidth="3.5" strokeDasharray="100" strokeDashoffset={100 - healthyStockPercent} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
              </svg>
              <span style={{ position: 'absolute', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {healthyStockPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Inventory Valuation */}
        <div className="kpi-card" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
          <div className="kpi-header">
            <span className="kpi-title">Total Stock Valuation</span>
            <div className="kpi-icon-wrapper" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
              <Boxes size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="kpi-value" style={{ fontSize: '1.45rem' }}>₹{kpis.totalInventoryValue.toLocaleString('en-IN')}</span>
              <span className="kpi-subtitle">Cap Limit: ₹20L</span>
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '50px', height: '50px', flexShrink: 0 }}>
              <svg width="50" height="50" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--border-color)" strokeWidth="3.5" />
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="url(#ring-amber)" strokeWidth="3.5" strokeDasharray="100" strokeDashoffset={100 - valuationPercent} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
              </svg>
              <span style={{ position: 'absolute', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {valuationPercent}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Sections Grid */}
      <div className="dashboard-grid">
        {/* Left Side: Recent Sales Challans & Inventory Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Recent Challans Card */}
          <div className="card-widget">
            <div className="widget-title-container">
              <span className="widget-title">
                <ClipboardList size={18} style={{ color: 'var(--color-brand)' }} />
                Recent Sales Challans
              </span>
              <Link to="/challans" style={{ fontSize: '0.875rem', color: 'var(--color-brand)', fontWeight: 600 }}>View All</Link>
            </div>
            {recentChallans.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>No recent challans found.</div>
            ) : (
              <div className="table-container" style={{ margin: 0, border: 'none', boxShadow: 'none' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Challan No.</th>
                      <th>Customer / Business</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Created Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentChallans.map((challan) => (
                      <tr key={challan.id}>
                        <td style={{ fontWeight: 600 }}>
                          <Link to={`/challans`} style={{ color: 'var(--color-brand)' }}>{challan.challanNumber}</Link>
                        </td>
                        <td>
                          <div>{challan.customer.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{challan.customer.businessName}</div>
                        </td>
                        <td style={{ fontWeight: 600 }}>₹{challan.totalAmount.toLocaleString('en-IN')}</td>
                        <td>
                          <span className={`badge ${
                            challan.status === 'Confirmed' ? 'badge-success' : 
                            challan.status === 'Draft' ? 'badge-warning' : 'badge-danger'
                          }`}>
                            {challan.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {new Date(challan.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* CRM Recent Follow-up logs */}
          <div className="card-widget">
            <div className="widget-title-container">
              <span className="widget-title">
                <Users size={18} style={{ color: 'var(--role-sales)' }} />
                CRM Activities
              </span>
              <Link to="/crm" style={{ fontSize: '0.875rem', color: 'var(--color-brand)', fontWeight: 600 }}>Manage CRM</Link>
            </div>
            {recentNotes.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>No recent CRM notes.</div>
            ) : (
              <div className="timeline">
                {recentNotes.map((note) => (
                  <div key={note.id} className="timeline-item">
                    <div className="timeline-dot" style={{ backgroundColor: 'var(--role-sales)' }}></div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="timeline-author">{note.customer.name} ({note.customer.businessName})</span>
                        <span>{new Date(note.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
                      </div>
                      <p className="timeline-text">{note.note}</p>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.25rem', textAlign: 'right' }}>
                        Logged by: <strong>{note.createdBy}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Side: Low Stock Warnings & Stock Movements */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Low Stock Panel */}
          <div className="card-widget" style={{ borderLeft: '4px solid var(--color-danger)' }}>
            <div className="widget-title-container">
              <span className="widget-title">
                <AlertTriangle size={18} style={{ color: 'var(--color-danger)' }} />
                Critical Low Stock
              </span>
              <Link to="/inventory" style={{ fontSize: '0.875rem', color: 'var(--color-brand)', fontWeight: 600 }}>Replenish</Link>
            </div>
            {topLowStockAlerts.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-success)', fontWeight: 600, fontSize: '0.875rem' }}>
                ✓ All items healthy
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {topLowStockAlerts.map(prod => (
                  <div key={prod.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    backgroundColor: 'var(--color-danger-light)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(239, 68, 68, 0.1)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{prod.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>SKU: {prod.sku}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--color-danger)', fontSize: '1rem' }}>{prod.currentStock}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Min Alert: {prod.minStockAlert}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Stock Movement Logs */}
          <div className="card-widget">
            <div className="widget-title-container">
              <span className="widget-title">
                <Activity size={18} style={{ color: 'var(--role-warehouse)' }} />
                Stock Log Feed
              </span>
            </div>
            {recentStockLogs.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>No stock movements recorded.</div>
            ) : (
              <div className="timeline" style={{ paddingLeft: '1.25rem' }}>
                {recentStockLogs.map((log) => (
                  <div key={log.id} className="timeline-item">
                    <div className="timeline-dot" style={{ 
                      backgroundColor: log.movementType === 'IN' ? 'var(--color-success)' : 'var(--color-danger)' 
                    }}></div>
                    <div className="timeline-content" style={{ padding: '0.75rem' }}>
                      <div className="timeline-header" style={{ marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{log.product.name}</span>
                        <span>{new Date(log.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span className={`badge ${log.movementType === 'IN' ? 'badge-success' : 'badge-danger'}`} style={{ padding: '0.1rem 0.4rem', fontSize: '0.65rem' }}>
                          {log.movementType} {log.quantityChanged} units
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>by {log.createdBy}</span>
                      </div>
                      <p className="timeline-text" style={{ fontSize: '0.8rem' }}>{log.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
