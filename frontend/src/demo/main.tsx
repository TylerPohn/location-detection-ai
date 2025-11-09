import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App';
import { startMockServiceWorker } from './mocks/browser';
import '../index.css';

/**
 * Demo Mode Entry Point
 * This file starts the MSW worker before mounting the React app
 */
async function enableDemoMode() {
  // Start MSW worker to intercept API calls
  await startMockServiceWorker();

  // Mount React app after MSW is ready
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <DemoModeIndicator />
      <App />
    </React.StrictMode>
  );
}

/**
 * Demo mode visual indicator
 */
function DemoModeIndicator() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: '#ff6b35',
        color: 'white',
        padding: '8px 16px',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: 600,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      🎭 DEMO MODE - All API calls are mocked (no backend required)
    </div>
  );
}

// Start the app with demo mode enabled
enableDemoMode().catch((error) => {
  console.error('Failed to start demo mode:', error);
});
