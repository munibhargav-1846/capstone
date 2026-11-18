import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
const ToastContext = createContext(void 0);
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  const showToast = useCallback(
    (message, type = "success") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => dismiss(id), 3600);
    },
    [dismiss]
  );
  return <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
    aria-live="polite"
    className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
  >
        {toasts.map((toast) => <div
    key={toast.id}
    className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg text-sm text-slate-800 dark:text-slate-100"
  >
            {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {toast.type === "error" && <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
            {toast.type === "info" && <Info className="w-4 h-4 text-blue-600 shrink-0" />}
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
    type="button"
    onClick={() => dismiss(toast.id)}
    aria-label="Dismiss notification"
    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
  >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>)}
      </div>
    </ToastContext.Provider>;
}
function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
export {
  ToastProvider,
  useToast
};
