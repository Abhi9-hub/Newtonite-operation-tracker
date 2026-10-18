// Non-blocking notifications. toast.error(err) formats any ApiError consistently,
// including a short request id the user can quote in a bug report.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { ApiError } from '../api/client';

type Kind = 'error' | 'success' | 'info';
interface ToastItem { id: number; kind: Kind; text: string }
interface ToastApi { push: (kind: Kind, text: string) => void; error: (err: unknown) => void }

const Ctx = createContext<ToastApi | null>(null);
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((kind: Kind, text: string) => {
    const id = nextId++;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000); // auto-dismiss
  }, []);

  const error = useCallback((err: unknown) => {
    if (err instanceof ApiError) {
      push('error', err.requestId ? `${err.message} (ref ${err.requestId.slice(0, 8)})` : err.message);
    } else {
      push('error', 'Something unexpected happened');
    }
  }, [push]);

  const value = useMemo(() => ({ push, error }), [push, error]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>)}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast must be used inside ToastProvider');
  return c;
}