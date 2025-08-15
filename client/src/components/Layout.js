import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

const Layout = ({ children }) => {
  const { user, logout, isAuthenticated, isOrganizer } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen" style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto' }}>
      <header style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <nav className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem' }}>
          <Link to="/" style={{ fontSize: '1.5rem', fontWeight: 'bold', textDecoration: 'none', color: 'var(--text-primary)' }}>
            EventManager
          </Link>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link 
              to="/" 
              className={`btn ${isActive('/') ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textDecoration: 'none' }}
            >
              Events
            </Link>
            
            {isAuthenticated && (
              <>
                <Link 
                  to="/my-bookings" 
                  className={`btn ${isActive('/my-bookings') ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ textDecoration: 'none' }}
                >
                  My Bookings
                </Link>
                
                {isOrganizer && (
                  <>
                    <Link 
                      to="/my-events" 
                      className={`btn ${isActive('/my-events') ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ textDecoration: 'none' }}
                    >
                      My Events
                    </Link>
                    <Link 
                      to="/create-event" 
                      className={`btn ${isActive('/create-event') ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ textDecoration: 'none' }}
                    >
                      Create Event
                    </Link>
                  </>
                )}
              </>
            )}
            
            <button 
              onClick={toggleTheme}
              className="btn btn-secondary"
              title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            
            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {user.firstName} {user.lastName}
                </span>
                <button onClick={handleLogout} className="btn btn-secondary">
                  Logout
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Link to="/login" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                  Register
                </Link>
              </div>
            )}
          </div>
        </nav>
      </header>

      <main className="container" style={{ padding: '2rem 1rem', flex: 1 }}>
        {children}
      </main>

      <footer style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', padding: '1rem', textAlign: 'center' }}>
        <div className="container">
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            © 2024 Event Management System. Built with React & Node.js
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;