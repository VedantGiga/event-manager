import React from 'react';

const LoadingSpinner = ({ size = 'medium', text = 'Loading...' }) => {
  const sizeClasses = {
    small: { width: '1rem', height: '1rem' },
    medium: { width: '2rem', height: '2rem' },
    large: { width: '3rem', height: '3rem' }
  };

  return (
    <div className="loading">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div 
          className="spinner"
          style={sizeClasses[size]}
        />
        {text && (
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {text}
          </span>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;