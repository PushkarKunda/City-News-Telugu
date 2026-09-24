// src/context/ToastContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast Notification Container */}
      <div 
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          maxWidth: '420px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => {
          let bg = 'rgba(15, 23, 42, 0.9)';
          let border = '1px solid rgba(255, 255, 255, 0.1)';
          let icon = <CheckCircle2 size={18} className="text-emerald-400" />;

          if (toast.type === 'error') {
            border = '1px solid rgba(244, 63, 94, 0.4)';
            icon = <AlertCircle size={18} className="text-rose-400" />;
          } else if (toast.type === 'warning') {
            border = '1px solid rgba(245, 158, 11, 0.4)';
            icon = <AlertTriangle size={18} className="text-amber-400" />;
          } else if (toast.type === 'info') {
            border = '1px solid rgba(56, 189, 248, 0.4)';
            icon = <Info size={18} className="text-sky-400" />;
          } else {
            border = '1px solid rgba(16, 185, 129, 0.4)';
            icon = <CheckCircle2 size={18} className="text-emerald-400" />;
          }

          return (
            <div
              key={toast.id}
              style={{
                background: bg,
                backdropFilter: 'blur(16px)',
                border,
                borderRadius: '0.75rem',
                padding: '0.85rem 1.15rem',
                color: '#ffffff',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.85rem',
                pointerEvents: 'auto',
                fontSize: '0.85rem',
                lineHeight: 1.4,
                animation: 'slideInUp 0.25s ease-out forwards',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {icon}
                <span>{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.5)',
                  cursor: 'pointer',
                  padding: '0.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '4px',
                }}
                className="hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
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
