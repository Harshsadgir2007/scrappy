import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    let safeMessage = '';
    if (Array.isArray(message)) {
      safeMessage = message
        .map((m) => (typeof m === 'object' && m ? m.msg || m.detail || JSON.stringify(m) : String(m)))
        .join(', ');
    } else if (typeof message === 'object' && message !== null) {
      safeMessage = message.msg || message.detail || message.message || JSON.stringify(message);
    } else {
      safeMessage = String(message || 'An unexpected error occurred');
    }

    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message: safeMessage, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div
        className="toast-container"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 9999,
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            style={{
              padding: '12px 18px',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              backgroundColor:
                toast.type === 'success'
                  ? '#28A745'
                  : toast.type === 'error'
                  ? '#DC3545'
                  : toast.type === 'warning'
                  ? '#F77F00'
                  : '#17A2B8',
              animation: 'fadeIn 0.2s ease-in-out',
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
