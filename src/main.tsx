import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Unregister any old PWA Service Workers & clear WebView CacheStorage so updated APKs always show the latest UI immediately
if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        registrations.forEach((reg) => reg.unregister());
      })
      .catch(() => {});
  }
  if ('caches' in window) {
    caches
      .keys()
      .then((keys) => {
        keys.forEach((k) => caches.delete(k));
      })
      .catch(() => {});
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
