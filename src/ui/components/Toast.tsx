import clsx from 'clsx';
import { useToastStore, type ToastType } from '../store/toastStore';

const STYLE: Record<ToastType, { container: string; icon: string }> = {
  success: { container: 'bg-s-fi-subtle border-s-br-default text-s-tx-muted',  icon: '✓' },
  error:   { container: 'bg-d-fi-subtle border-d-br-default text-d-tx-muted',  icon: '✕' },
  info:    { container: 'bg-b-fi-subtle border-b-br-default text-b-tx-muted',  icon: 'ℹ' },
  warn:    { container: 'bg-w-fi-subtle border-w-br-default text-w-tx-muted',  icon: '⚠' },
  neutral: { container: 'bg-n-sf-raised border-n-br-default text-n-tx-primary', icon: '·' },
};

// Renders all active toasts. Mount once at the root of the plugin iframe.
export function ToastHub() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-[1000] pointer-events-none min-w-[180px] max-w-[320px]">
      {toasts.map((t) => {
        const s = STYLE[t.type];
        return (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border',
              'text-[11px] font-medium backdrop-blur-sm shadow-lg',
              'pointer-events-auto cursor-default whitespace-nowrap',
              s.container,
            )}
          >
            <span className="text-[12px] opacity-90">{t.icon ?? s.icon}</span>
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
