import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Terminal, ArrowRight, Sparkles } from 'lucide-react';

const CommandPalette: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const allActions = [
    { name: 'Navigate to Control Dashboard', path: '/', roles: ['Admin', 'Sales', 'Warehouse', 'Accounts'] },
    { name: 'Open CRM Customer Pipeline', path: '/crm', roles: ['Admin', 'Sales', 'Accounts'] },
    { name: 'Open Inventory Catalog Logs', path: '/inventory', roles: ['Admin', 'Sales', 'Warehouse', 'Accounts'] },
    { name: 'Review Commercial Sales Challans', path: '/challans', roles: ['Admin', 'Sales', 'Warehouse', 'Accounts'] },
    { name: 'Create New Sales Challan', path: '/challans/new', roles: ['Admin', 'Sales'] },
  ];

  const filteredActions = allActions.filter(
    action => 
      action.roles.includes(user.role) && 
      action.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleAction = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 300, alignItems: 'flex-start', paddingTop: '15vh' }} onClick={() => setIsOpen(false)}>
      <div 
        className="modal-content animate-card-pop" 
        style={{ 
          maxWidth: '550px', 
          background: 'rgba(15, 23, 42, 0.85)', 
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          boxShadow: 'var(--shadow-lg), 0 0 40px rgba(99, 102, 241, 0.25)',
          borderColor: 'rgba(99, 102, 241, 0.2)'
        }} 
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', borderBottom: 'var(--border-style)' }}>
          <Terminal size={18} style={{ color: 'var(--color-info)' }} />
          <input
            ref={inputRef}
            type="text"
            className="form-input"
            style={{ 
              border: 'none', 
              background: 'none', 
              padding: 0, 
              fontSize: '1rem', 
              color: '#ffffff',
              outline: 'none',
              boxShadow: 'none'
            }}
            placeholder="Type command to navigate... (or press Ctrl+K to close)"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: 'var(--text-secondary)' }}>ESC</span>
        </div>

        <div style={{ padding: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
          {filteredActions.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              No matching commands or actions.
            </div>
          ) : (
            filteredActions.map((action, idx) => (
              <div
                key={idx}
                onClick={() => handleAction(action.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  background: 'transparent'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Sparkles size={14} style={{ color: 'var(--color-brand)' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff' }}>{action.name}</span>
                </div>
                <ArrowRight size={14} style={{ color: 'var(--text-tertiary)' }} />
              </div>
            ))
          )}
        </div>

        <div style={{ padding: '0.75rem 1.25rem', borderTop: 'var(--border-style)', fontSize: '0.7rem', color: 'var(--text-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
          <span>Terminal: {user.name} ({user.role})</span>
          <span>Shortcut: <strong>Ctrl + K</strong></span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
