import React from 'react';

const ErrorMessage = ({ error, onRetry }) => {
  const getErrorMessage = (error) => {
    if (typeof error === 'string') return error;
    if (error?.response?.data?.error) return error.response.data.error;
    if (error?.message) return error.message;
    return 'An unexpected error occurred';
  };

  return (
    <div className="alert alert-error">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{getErrorMessage(error)}</span>
        {onRetry && (
          <button onClick={onRetry} className="btn btn-secondary" style={{ marginLeft: '1rem' }}>
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;