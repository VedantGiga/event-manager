import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import Layout from './components/Layout';
import OfflineIndicator from './components/OfflineIndicator';
import EventList from './pages/EventList';
import EventDetail from './pages/EventDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import CreateEvent from './pages/CreateEvent';
import MyBookings from './pages/MyBookings';
import MyEvents from './pages/MyEvents';
import { registerSW } from './utils/serviceWorker';
import './styles/global.css';

// Protected Route Component
const ProtectedRoute = ({ children, requireAuth = true, requireOrganizer = false }) => {
  const { isAuthenticated, isOrganizer, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (requireOrganizer && !isOrganizer) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// App Routes Component (needs to be inside AuthProvider)
const AppRoutes = () => {
  useEffect(() => {
    registerSW();
  }, []);

  return (
    <>
      <OfflineIndicator />
      <Layout>
        <Routes>
          <Route path="/" element={<EventList />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/my-bookings" 
            element={
              <ProtectedRoute>
                <MyBookings />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/my-events" 
            element={
              <ProtectedRoute requireOrganizer>
                <MyEvents />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/create-event" 
            element={
              <ProtectedRoute requireOrganizer>
                <CreateEvent />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;