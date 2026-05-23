import { useState } from 'react';
import { useBannerStore, type BannerType } from '../store/bannerStore';
import clsx from 'clsx';

const TYPE_VARS: Record<BannerType, string> = {
  warning: '--bn-bg:rgba(234,179,8,.09);--bn-border:rgba(234,179,8,.28);--bn-text:rgb(253,224,71);--bn-icon:rgb(250,204,21)',
  error:   '--bn-bg:rgba(239,68,68,.09);--bn-border:rgba(239,68,68,.28);--bn-text:rgb(252,165,165);--bn-icon:rgb(248,113,113)',
  info:    '--bn-bg:rgba(59,130,246,.09);--bn-border:rgba(59,130,246,.28);--bn-text:rgb(147,197,253);--bn-icon:rgb(96,165,250)',
  success: '--bn-bg:rgba(34,197,94,.09);--bn-border:rgba(34,197,94,.28);--bn-text:rgb(134,239,172);--bn-icon:rgb(74,222,128)',
  neutral: '--bn-bg:rgba(255,255,255,.03);--bn-border:rgba(255,255,255,.09);--bn-text:rgba(255,255,255,.55);--bn-icon:rgba(255,255,255,.4)',
};

const TYPE_ICON: Record<BannerType, string> = {
  warning: '⚠', error: '✕', info: 'ℹ', success: '✓', neutral: '·',
};

// Single banner item — used by BannerSlot internally.
function BannerItem({ id, type, title, message, detail, icon, actions, dismissable, autoClose }: {
  id: string; type: BannerType; title?: string; message: string;
  detail?: string; icon?: string; actions?: import('../store/bannerStore').BannerAction[];
  dismissable?: boolean; autoClose?: number;
}) {
  const remove = useBannerStore((s) => s.remove);
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="relative overflow-hidden border-b"
      style={{ cssText: TYPE_VARS[type] } as React.CSSProperties}
      // inline style needed for CSS custom props since Tailwind can't set them dynamically
      {...{ style: { borderColor: 'var(--bn-border)', background: 'var(--bn-bg)' } }}
    >
      <div className="flex items-start gap-2 px-3 py-2">
        <span className="text-[12px] shrink-0 mt-[1px] leading-[1.5]" style={{ color: 'var(--bn-icon)' }}>
          {icon ?? TYPE_ICON[type]}
        </span>
        <div className="flex-1 min-w-0">
          {title && (
            <p className="text-[11px] font-bold mb-0.5" style={{ color: 'var(--bn-text)' }}>{title}</p>
          )}
          <p className="text-[11px] leading-[1.5] opacity-90" style={{ color: 'var(--bn-text)' }}>{message}</p>
          {detail && (
            <>
              {expanded && (
                <div className="text-[11px] opacity-70 leading-[1.5] mt-1.5 pt-1.5 border-t" style={{ color: 'var(--bn-text)', borderColor: 'var(--bn-border)' }}>
                  {detail}
                </div>
              )}
              <button
                className="inline-block mt-1 text-[10px] opacity-80 bg-none border-none p-0 cursor-pointer underline underline-offset-2 hover:opacity-100"
                style={{ color: 'var(--bn-icon)' }}
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? 'Show less ▴' : 'Show more ▾'}
              </button>
            </>
          )}
          {actions && actions.length > 0 && (
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {actions.map((a, i) => (
                <button
                  key={i}
                  onClick={a.onClick}
                  className={clsx(
                    'text-[10px] px-2.5 py-1 rounded border cursor-pointer transition-colors hover:bg-white/[0.07]',
                    a.style === 'primary' && 'font-semibold',
                  )}
                  style={{
                    borderColor: a.style === 'primary' ? 'transparent' : 'var(--bn-border)',
                    color: a.style === 'primary' ? '#000' : 'var(--bn-text)',
                    background: a.style === 'primary' ? 'var(--bn-icon)' : 'none',
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {dismissable !== false && (
          <button
            onClick={() => remove(id)}
            className="shrink-0 w-[18px] h-[18px] flex items-center justify-center rounded-[3px] bg-none border-none opacity-35 cursor-pointer text-[10px] mt-[1px] transition-opacity hover:opacity-100"
            style={{ color: 'var(--bn-text)' }}
            aria-label="Dismiss"
          >
            ✕
          </button>
        )}
      </div>
      {/* Auto-close progress bar */}
      {autoClose && (
        <div className="h-[2px]" style={{ background: 'var(--bn-border)' }}>
          <div
            className="h-full w-full"
            style={{
              background: 'var(--bn-icon)',
              transition: `width ${autoClose}ms linear`,
              width: '0%',
            }}
          />
        </div>
      )}
    </div>
  );
}

// Mount once near the top of the app layout — renders all active banners stacked.
export function BannerSlot({ className }: { className?: string }) {
  const banners = useBannerStore((s) => s.banners);
  if (banners.length === 0) return null;
  return (
    <div className={clsx('shrink-0', className)}>
      {banners.map((b) => (
        <BannerItem key={b.id} {...b} />
      ))}
    </div>
  );
}
