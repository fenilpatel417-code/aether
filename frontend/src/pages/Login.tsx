import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, User, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      login(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Server connection failed. Make sure the backend is running.');
    } finally {
      setSubmitting(false);
    }
  };

  const loadDemoUser = (role: string) => {
    setUsername(role.toLowerCase());
    setPassword(`${role.toLowerCase()}123`);
  };

  return (
    <div className="login-container">
      {/* Left Column: 3D Scene Illustration */}
      <div className="login-illustration-side">
        <div className="illustration-text-card">
          <h2 className="illustration-title">Aether Logistics Hub</h2>
          <p className="illustration-desc">
            Experience next-generation industrial supply chain intelligence. Track real-time warehouse inventory levels, schedule client follow-up logs, and dispatch commercial sales challans within a unified cyber operations terminal.
          </p>
        </div>
      </div>

      {/* Right Column: Form Panel */}
      <div className="login-form-side">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">Ω</div>
            <h1 className="login-title">Operations Portal</h1>
            <p className="login-subtitle">AetherERP + CRM Wholesale Distribution</p>
          </div>

          {error && <div className="login-err">{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Username</label>
              <div className="search-input-wrapper" style={{ maxWidth: 'none' }}>
                <User size={18} className="search-icon" />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Password</label>
              <div className="search-input-wrapper" style={{ maxWidth: 'none' }}>
                <KeyRound size={18} className="search-icon" />
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '0.5rem', height: '42px' }}
              disabled={submitting}
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Access Terminal'}
            </button>
          </form>

          <div className="credential-hints">
            <div className="hints-title">Quick demo authorization codes</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => loadDemoUser('Admin')}>Admin</button>
              <button className="btn btn-secondary btn-sm" onClick={() => loadDemoUser('Sales')}>Sales</button>
              <button className="btn btn-secondary btn-sm" onClick={() => loadDemoUser('Warehouse')}>Warehouse</button>
              <button className="btn btn-secondary btn-sm" onClick={() => loadDemoUser('Accounts')}>Accounts</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
