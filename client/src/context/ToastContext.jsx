import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const newToast = {
      id,
      type: toast.type || 'info', // 'success' | 'warning' | 'error' | 'info'
      title: toast.title,
      message: toast.message,
      duration: toast.duration || 4500
    };

    setToasts((prev) => [...prev, newToast]);

    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (title, message) => addToast({ type: 'success', title, message }),
    error: (title, message) => addToast({ type: 'error', title, message }),
    warning: (title, message) => addToast({ type: 'warning', title, message }),
    info: (title, message) => addToast({ type: 'info', title, message })
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-ops-success flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-ops-warning flex-shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-ops-danger flex-shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-brand-500 flex-shrink-0" />;
    }
  };

  return (
    <ToastContext.Provider value={{ toast, addToast, removeToast }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 p-4 bg-white rounded-lg shadow-elevated border border-ink-200 text-ink-900 transition-all duration-200 animate-in fade-in slide-in-from-bottom-3"
          >
            {getIcon(t.type)}
            <div className="flex-1 min-w-0">
              {t.title && <p className="text-sm font-semibold leading-tight text-ink-900 mb-0.5">{t.title}</p>}
              {t.message && <p className="text-xs text-ink-600 leading-normal">{t.message}</p>}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-ink-400 hover:text-ink-700 transition-colors p-0.5"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
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
  return context.toast;
};
