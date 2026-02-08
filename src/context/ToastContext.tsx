import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastContextType {
  toast: (type: ToastType, message: string) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
})

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

let nextId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = ++nextId
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const ctx: ToastContextType = {
    toast: addToast,
    success: useCallback((msg: string) => addToast('success', msg), [addToast]),
    error: useCallback((msg: string) => addToast('error', msg), [addToast]),
    info: useCallback((msg: string) => addToast('info', msg), [addToast]),
  }

  return (
    <ToastContext.Provider value={ctx}>
      {children}

      {/* Toast container */}
      <div
        className="fixed top-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Toast item
// ---------------------------------------------------------------------------

const STYLES: Record<ToastType, { bg: string; icon: typeof CheckCircle; iconClass: string }> = {
  success: { bg: 'bg-green-50 border-green-200', icon: CheckCircle, iconClass: 'text-green-500' },
  error: { bg: 'bg-red-50 border-red-200', icon: AlertCircle, iconClass: 'text-red-500' },
  info: { bg: 'bg-blue-50 border-blue-200', icon: Info, iconClass: 'text-blue-500' },
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const style = STYLES[toast.type]
  const Icon = style.icon

  return (
    <div
      className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-3 shadow-lg animate-slide-in ${style.bg}`}
      role="alert"
    >
      <Icon size={18} className={`shrink-0 mt-0.5 ${style.iconClass}`} />
      <p className="flex-1 text-sm text-gray-800">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-600"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useToast = () => useContext(ToastContext)
