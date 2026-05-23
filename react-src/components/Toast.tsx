import { useToastStore, type ToastType } from '../store/toastStore';

const STYLE: Record<ToastType, { bg: string; border: string; color: string; icon: string }> = {
  success: { bg: 'rgba(34,197,94,.15)',   border: 'rgba(34,197,94,.35)',   color: 'rgb(134,239,172)',      icon: '✓' },
  error:   { bg: 'rgba(239,68,68,.15)',   border: 'rgba(239,68,68,.35)',   color: 'rgb(252,165,165)',      icon: '✕' },
  info:    { bg: 'rgba(59,130,246,.15)',  border: 'rgba(59,130,246,.35)',  color: 'rgb(147,197,253)',      icon: 'ℹ' },
  warn:    { bg: 'rgba(234,179,8,.15)',   border: 'rgba(234,179,8,.35)',   color: 'rgb(253,224,71)',       icon: '⚠' },
  neutral: { bg: 'rgba(255,255,255,.07)', border: 'rgba(255,255,255,.14)', color: 'rgba(255,255,255,.8)',  icon: '·' },
};

// Renders all active toasts. Mount once at the root of the plugin iframe.
export function ToastHub() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        zIndex: 1000,
        pointerEvents: 'none',
        minWidth: 180,
        maxWidth: 320,
      }}
    >
      {toasts.map((t) => {
        const s = STYLE[t.type];
        return (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '7px 12px 7px 10px',
              borderRadius: 8,
              border: `1px solid ${s.border}`,
              background: s.bg,
              color: s.color,
              fontSize: 11,
              fontWeight: 500,
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 16px rgba(0,0,0,.3)',
              pointerEvents: 'auto',
              cursor: 'default',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: 12, opacity: 0.9 }}>{t.icon ?? s.icon}</span>
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
