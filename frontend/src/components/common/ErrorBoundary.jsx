import React from 'react';
import { Link } from 'react-router-dom';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          fontFamily: "'Inter', sans-serif",
          backgroundColor: '#F8F9FA'
        }}>
          <div style={{
            maxWidth: '500px',
            backgroundColor: '#FFFFFF',
            padding: '40px 32px',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
            border: '1px solid #E9ECEF'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h1 style={{ fontSize: '24px', color: '#1B4332', marginBottom: '10px', fontWeight: 700 }}>
              Something Went Wrong
            </h1>
            <p style={{ color: '#6C757D', fontSize: '14px', lineHeight: 1.5, marginBottom: '24px' }}>
              An unexpected error occurred while rendering this view. Your session and data are secure.
            </p>

            {this.state.error && (
              <div style={{
                backgroundColor: '#FFF5F5',
                border: '1px solid #FFE3E3',
                color: '#C92A2A',
                padding: '12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontFamily: 'monospace',
                textAlign: 'left',
                overflowX: 'auto',
                marginBottom: '24px'
              }}>
                {this.state.error.toString()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#2D6A4F',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/login';
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#F8F9FA',
                  color: '#495057',
                  border: '1px solid #CED4DA',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Sign In Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
