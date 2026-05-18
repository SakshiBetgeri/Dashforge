import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          color: '#ef4444',
          padding: '2rem',
          fontFamily: 'monospace',
          background: '#0A0E1A',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>DashForge Runtime Exception</h2>
          <pre style={{ 
            background: 'rgba(255,255,255,0.05)', 
            padding: '1rem', 
            borderRadius: '8px',
            maxWidth: '90%',
            overflow: 'auto'
          }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '2rem',
              padding: '0.5rem 1rem',
              background: '#00D9FF',
              color: '#0A0E1A',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Retry Session
          </button>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
