import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toastConfig: Record<ToastType, { icon: React.ReactNode; ring: string; iconColor: string }> = {
  success: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    ring: 'ring-emerald-500/20',
    iconColor: 'text-emerald-500',
  },
  error: {
    icon: <XCircle className="h-5 w-5" />,
    ring: 'ring-rose-500/20',
    iconColor: 'text-rose-500',
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5" />,
    ring: 'ring-amber-500/20',
    iconColor: 'text-amber-500',
  },
  info: {
    icon: <Info className="h-5 w-5" />,
    ring: 'ring-brand-500/20',
    iconColor: 'text-brand-500',
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => removeToast(id), 4000);
    },
    [removeToast]
  );

  const value: ToastContextValue = {
    toast,
    success: (title, message) => toast('success', title, message),
    error: (title, message) => toast('error', title, message),
    info: (title, message) => toast('info', title, message),
    warning: (title, message) => toast('warning', title, message),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container */}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const cfg = toastConfig[t.type];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex animate-toast-in items-start gap-3 rounded-xl bg-white p-4 shadow-lg ring-1 ${cfg.ring} ring-slate-900/5`}
            >
              <div className={`mt-0.5 shrink-0 ${cfg.iconColor}`}>{cfg.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">{t.title}</p>
                {t.message && <p className="mt-0.5 text-xs text-slate-500">{t.message}</p>}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}