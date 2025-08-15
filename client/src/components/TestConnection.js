import React, { useState, useEffect } from 'react';
import { eventsAPI } from '../utils/api';

const TestConnection = () => {
  const [status, setStatus] = useState('Testing...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const testAPI = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/test');
        if (response.ok) {
          setStatus('✅ Backend Connected');
        } else {
          setStatus('❌ Backend Error');
        }
      } catch (err) {
        setStatus('❌ Backend Offline');
        setError(err.message);
      }
    };

    testAPI();
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: '1rem',
      right: '1rem',
      padding: '0.5rem 1rem',
      backgroundColor: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: '0.375rem',
      fontSize: '0.875rem',
      zIndex: 1000
    }}>
      <div>{status}</div>
      {error && <div style={{ color: 'var(--error)', fontSize: '0.75rem' }}>{error}</div>}
    </div>
  );
};

export default TestConnection;