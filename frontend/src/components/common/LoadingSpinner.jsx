import React from 'react';

const LoadingSpinner = ({ text = 'Loading...' }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      minHeight: '200px',
      gap: '12px'
    }}>
      <div style={{
        width: '36px',
        height: '36px',
        border: '3px solid rgba(45, 106, 79, 0.2)',
        borderTop: '3px solid #2D6A4F',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <span style={{ color: '#6C757D', fontSize: '14px' }}>{text}</span>
    </div>
  );
};

export default LoadingSpinner;
