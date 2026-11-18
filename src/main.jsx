import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';
import { initInstallPrompt } from './pwa/installPrompt.js';
import { registerServiceWorker } from './pwa/serviceWorkerRegistration.js';
import { APP_BASE_URL } from './services/config.js';
import { startNetworkMonitor } from './services/networkMonitor.js';
import { queryClient } from './services/queryClient.js';

// PWA bootstrapping: install prompt capture, real connectivity monitor, Service Worker.
initInstallPrompt();
startNetworkMonitor();
registerServiceWorker();

// "/Task6.Auth/" on GitHub Pages -> "/Task6.Auth"; "/" locally -> undefined.
const routerBasename = APP_BASE_URL.replace(/\/$/, '') || undefined;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter basename={routerBasename}>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
