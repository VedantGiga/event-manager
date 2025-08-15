import React, { useEffect } from 'react';
import useAppStore from '../store/useAppStore';

const OfflineIndicator = () => {
  const { isOnline, setOnlineStatus, pendingActions, syncPendingActions } = useAppStore();

  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
      syncPendingActions();
    };

    const handleOffline = () => {
      setOnlineStatus(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus, syncPendingActions]);

  if (isOnline && pendingActions.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: isOnline ? 'var(--warning)' : 'var(--error)',
      color: 'white',
      padding: '0.5rem',
      textAlign: 'center',
      fontSize: '0.875rem',
      zIndex: 1000
    }}>
      {!isOnline ? (
        '📡 You are offline. Changes will sync when connection is restored.'
      ) : pendingActions.length > 0 ? (
        `🔄 Syncing ${pendingActions.length} pending action${pendingActions.length > 1 ? 's' : ''}...`
      ) : null}
    </div>
  );
};

export default OfflineIndicator;