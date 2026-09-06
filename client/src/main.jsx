import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import React from 'react';
import './index.css';
import App from './App.jsx';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Crash caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh', 
          backgroundColor: '#0f0f12', 
          color: '#ffffff', 
          padding: '20px', 
          fontFamily: 'sans-serif',
          textAlign: 'center' 
        }}>
          <div style={{ maxWidth: '400px', background: '#18181b', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: '#f87171' }}>Oops, may naganap na error!</h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px', lineHeight: '1.5' }}>
              Nagka-issue habang nagloload ang application sa iyong browser. Paki-contact ang developer para maayos ang isyung ito.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              style={{ 
                width: '100%',
                padding: '10px 20px', 
                background: '#4f46e5', 
                color: '#ffffff', 
                border: 'none', 
                borderRadius: '8px', 
                fontSize: '13px', 
                fontWeight: 'bold', 
                cursor: 'pointer' 
              }}
            >
              I-refresh ang Pahina
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
