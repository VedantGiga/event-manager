import React from 'react';

const ErrorMessage = ({ error, onRetry }) => {
  const getErrorMessage = (error) => {
    if (typeof error === 'string') return error;
    if (error?.response?.data?.error) return error.response.data.error;
    if (error?.message) return error.message;
    return 'An unexpected error occurred';
  };

  const getValidationErrors = (error) => {
    if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      return error.response.data.errors;
    }
    return null;
  };

  const validationErrors = getValidationErrors(error);

  return (
    <div className="alert alert-error">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div>{getErrorMessage(error)}</div>
          {validationErrors && (
            <ul style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.5rem' }}>
              {validationErrors.map((err, index) => (
                <li key={index} style={{ fontSize: '0.9rem', color: 'var(--error-color)' }}>
                  <strong>{err.field}:</strong> {err.message}
                </li>
              ))}
            </ul>
          )}
        </div>
        {onRetry && (
          <button onClick={onRetry} className="btn btn-secondary" style={{ marginLeft: '1rem', flexShrink: 0 }}>
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;