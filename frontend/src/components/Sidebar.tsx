import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  FileText, 
  LogOut, 
  ShieldAlert 
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { user, logout, hasRole } = useAuth();

  if (!user) return null;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-icon">Ω</div>
        <span className="logo-text">AetherERP</span>
      </div>

      <nav className="sidebar-nav">
        {/* All roles can see dashboard */}
        <NavLink 
          to="/" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        {/* Admin, Sales, Accounts can see CRM */}
        {hasRole(['Admin', 'Sales', 'Accounts']) && (
          <NavLink 
            to="/crm" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Users size={20} />
            <span>CRM Customers</span>
          </NavLink>
        )}

        {/* All roles can view products list, but permissions differ inside */}
        <NavLink 
          to="/inventory" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Package size={20} />
          <span>Inventory</span>
        </NavLink>

        {/* All roles can view challans, but sales/admin can create them */}
        <NavLink 
          to="/challans" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <FileText size={20} />
          <span>Sales Challans</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile-badge">
          <div className="profile-avatar">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="profile-info">
            <span className="profile-name" title={user.name}>{user.name}</span>
            <span className="profile-role">{user.role}</span>
          </div>
        </div>
        <button className="logout-btn" onClick={logout}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
