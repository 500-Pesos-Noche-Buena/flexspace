import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("Crash caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: '#ff4444', background: '#1a1a1a', fontFamily: 'monospace', wordBreak: 'break-all', minHeight: '100vh', fontSize: '14px' }}>
          <h3>CRASH SA IOS SAFARI:</h3>
          <p><strong>Error:</strong> {this.state.error && this.state.error.toString()}</p>
          <p style={{ marginTop: '15px', color: '#ffbb44' }}><strong>Stack Trace / Saan galing:</strong></p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '11px', color: '#cccccc' }}>
            {this.state.error && this.state.error.stack}
          </pre>
          <p style={{ marginTop: '15px', color: '#44ffff' }}><strong>Component Stack:</strong></p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '11px', color: '#cccccc' }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
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
