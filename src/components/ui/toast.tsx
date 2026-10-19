import * as React from "react";
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | null>(null);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = React.useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { ...toast, id };
      setToasts((prev) => [...prev, newToast]);

      const duration = toast.duration ?? 4000;
      setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const typeIcons = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />,
  error: <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />,
  info: <Info className="h-5 w-5 text-sky-400 shrink-0" />,
};

const ToastCard: React.FC<{ toast: ToastItem; onClose: () => void }> = ({ toast, onClose }) => {
  const type = toast.type || "info";

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-start justify-between gap-3 p-4 rounded-xl shadow-xl backdrop-blur-md border animate-in slide-in-from-bottom-5 duration-200",
        "bg-slate-900/95 text-slate-100",
        type === "success" && "border-emerald-500/30",
        type === "error" && "border-rose-500/30",
        type === "warning" && "border-amber-500/30",
        type === "info" && "border-sky-500/30"
      )}
    >
      <div className="flex items-start gap-3">
        {typeIcons[type]}
        <div>
          <h4 className="text-sm font-semibold">{toast.title}</h4>
          {toast.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{toast.description}</p>
          )}
        </div>
      </div>
      <button
        onClick={onClose}
        className="text-muted-foreground hover:text-foreground transition-colors p-1"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
