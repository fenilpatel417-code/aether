import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  title: string;
}

const Navbar: React.FC<NavbarProps> = ({ title }) => {
  const { user } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('erp_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('erp_theme', theme);
  }, [theme]);

  const toggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
    // @ts-ignore
    if (!document.startViewTransition) {
      setTheme(prev => prev === 'light' ? 'dark' : 'light');
      return;
    }

    const x = e.clientX;
    const y = e.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    // @ts-ignore
    const transition = document.startViewTransition(() => {
      setTheme(prev => prev === 'light' ? 'dark' : 'light');
    });

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`
      ];
      document.documentElement.animate(
        {
          clipPath: theme === 'light' ? clipPath : clipPath.reverse()
        },
        {
          duration: 450,
          easing: 'ease-out',
          pseudoElement: theme === 'light' ? '::view-transition-new(root)' : '::view-transition-old(root)'
        }
      );
    });
  };

  const getRoleClass = (role: string) => {
    switch (role) {
      case 'Admin': return 'admin';
      case 'Sales': return 'sales';
      case 'Warehouse': return 'warehouse';
      case 'Accounts': return 'accounts';
      default: return '';
    }
  };

  return (
    <header className="top-navbar">
      <div className="navbar-left">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{title}</h2>
      </div>

      <div className="navbar-right">
        <button 
          className="theme-toggle-btn" 
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {user && (
          <span className={`role-tag ${getRoleClass(user.role)}`}>
            {user.role} Module
          </span>
        )}
      </div>
    </header>
  );
};

export default Navbar;
