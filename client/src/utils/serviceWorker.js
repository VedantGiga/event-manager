import { Workbox } from 'workbox-window';

let wb;

export const registerSW = () => {
  if ('serviceWorker' in navigator) {
    wb = new Workbox('/sw.js');

    wb.addEventListener('installed', (event) => {
      if (event.isUpdate) {
        // Show update available notification
        if (window.confirm('New version available! Reload to update?')) {
          window.location.reload();
        }
      }
    });

    wb.addEventListener('waiting', () => {
      // Show update prompt
      if (window.confirm('New version ready! Activate now?')) {
        wb.messageSkipWaiting();
      }
    });

    wb.addEventListener('controlling', () => {
      window.location.reload();
    });

    wb.register();
  }
};

export const unregisterSW = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister();
    });
  }
};

// Register for background sync
export const registerBackgroundSync = (tag) => {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then((registration) => {
      return registration.sync.register(tag);
    });
  }
};