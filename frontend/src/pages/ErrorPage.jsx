import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ErrorPage = ({ message, details }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const errorMessage = message || location.state?.message || 'An unexpected error occurred while processing your request.';
  const errorDetails = details || location.state?.details || null;

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
      backgroundColor: '#F8F9FA'
    }}>
      <div style={{
        maxWidth: '520px',
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        padding: '40px 32px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
        border: '1px solid #E9ECEF',
        textAlign: 'center'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#FFF3CD',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          margin: '0 auto 20px auto'
        }}>
          ⚠️
        </div>

        <h1 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#1B4332',
          margin: '0 0 10px 0'
        }}>
          Something Went Wrong
        </h1>

        <p style={{
          fontSize: '14px',
          color: '#6C757D',
          lineHeight: 1.6,
          margin: '0 0 24px 0'
        }}>
          {errorMessage}
        </p>

        {errorDetails && (
          <div style={{
            backgroundColor: '#FFF5F5',
            border: '1px solid #FFE3E3',
            color: '#C92A2A',
            borderRadius: '6px',
            padding: '12px',
            fontSize: '12px',
            fontFamily: 'monospace',
            textAlign: 'left',
            overflowX: 'auto',
            marginBottom: '24px'
          }}>
            {typeof errorDetails === 'object' ? JSON.stringify(errorDetails, null, 2) : String(errorDetails)}
          </div>
        )}

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '12px 20px',
              backgroundColor: '#2D6A4F',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s ease'
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = '#1B4332')}
            onMouseOut={(e) => (e.target.style.backgroundColor = '#2D6A4F')}
          >
            Return to Dashboard
          </button>

          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#E9ECEF',
              color: '#495057',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>

          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = '/login';
            }}
            style={{
              padding: '8px 20px',
              backgroundColor: 'transparent',
              color: '#6C757D',
              border: 'none',
              fontSize: '13px',
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
          >
            Sign In with Different Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
