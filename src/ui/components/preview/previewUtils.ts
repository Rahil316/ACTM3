import { contrastRatio } from '../../../plugin/ThemShopItems/colorEngine';
import { toast } from '../../store/toastStore';

export function getInkMode(hex: string): 'light' | 'dark' {
  const ratio = contrastRatio(hex, '#ffffff');
  return (ratio ?? 0) >= 3 ? 'light' : 'dark';
}

export function inkColor(mode: 'light' | 'dark', opacity = 1): string {
  const base = mode === 'light' ? '255,255,255' : '0,0,0';
  return opacity >= 1 ? `rgb(${base})` : `rgba(${base},${opacity})`;
}

export function normalizeHex(raw: string): string {
  const h = raw.replace(/^#/, '');
  return (
    '#' +
    (h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h
    )
      .toUpperCase()
      .padEnd(6, '0')
  );
}

export function copyText(text: string, label: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success(`Copied ${label}`),
    () => toast.error('Copy failed'),
  );
}
