import { useState, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { useUiStore } from '../store/uiStore';
import { useFigmaBridge, type BridgeCallbacks } from '../hooks/useFigmaBridge';
import { Sheet } from '../components/Sheet';
import { Backdrop } from '../components/Backdrop';
import { ModalHeader } from '../components/Modal';
import { Button } from '../components/Button';
import { Spinner } from '../components/Spinner';
import { toast } from '../store/toastStore';
import { banner } from '../store/bannerStore';
import { sendToPlugin, type ExportFormat } from '../types/messages';

const EXPORT_FORMATS: { format: ExportFormat; label: string; description: string }[] = [
  { format: 'json',             label: 'JSON',            description: 'Design token JSON' },
  { format: 'css',              label: 'CSS',             description: 'CSS custom properties' },
  { format: 'scss',             label: 'SCSS',            description: 'SCSS variables' },
  { format: 'csv',              label: 'CSV',             description: 'Spreadsheet format' },
  { format: 'dtcg',             label: 'DTCG',            description: 'Design Tokens Community Group' },
  { format: 'tailwind',         label: 'Tailwind',        description: 'Tailwind config extend object' },
  { format: 'style-dictionary', label: 'Style Dictionary', description: 'Style Dictionary tokens' },
  { format: 'ios-swift',        label: 'iOS Swift',       description: 'Swift color extensions' },
  { format: 'android',          label: 'Android',         description: 'Android color resources XML' },
  { format: 'rn-ts',            label: 'React Native',    description: 'TypeScript theme constants' },
];

export function ExportSheet() {
  const isOpen       = useUiStore((s) => s.activeOverlay === 'design-lab');
  const closeOverlay = useUiStore((s) => s.closeOverlay);
  const appState     = useAppStore((s) => s.appState);

  const [selectedFormats, setSelectedFormats] = useState<Set<ExportFormat>>(new Set(['json', 'css']));
  const [building, setBuilding] = useState(false);

  const handleExportBundle = useCallback((files: Array<{ name: string; content: string }>) => {
    setBuilding(false);
    if (!files || files.length === 0) {
      toast.error('Export returned no files.');
      return;
    }
    // Download as individual files or trigger ZIP via plugin
    files.forEach((file) => {
      const blob = new Blob([file.content], { type: 'text/plain' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    });
    toast.success(`Exported ${files.length} file${files.length > 1 ? 's' : ''}`);
  }, []);

  const handleError = useCallback((message: string) => {
    setBuilding(false);
    toast.error(message);
  }, []);

  const callbacks: BridgeCallbacks = {
    onExportBundle: handleExportBundle,
    onError: handleError,
  };
  useFigmaBridge(callbacks);

  function toggleFormat(format: ExportFormat) {
    setSelectedFormats((prev) => {
      const next = new Set(prev);
      if (next.has(format)) next.delete(format);
      else next.add(format);
      return next;
    });
  }

  function handleExport() {
    if (selectedFormats.size === 0) {
      toast.warn('Select at least one format.');
      return;
    }
    setBuilding(true);
    banner.show({
      id: 'export-building',
      type: 'info',
      title: 'Building export package…',
      message: `Generating ${selectedFormats.size} format${selectedFormats.size > 1 ? 's' : ''}`,
      autoClose: 3000,
    });
    sendToPlugin({
      type: 'request-export-bundle',
      formats: Array.from(selectedFormats),
      state: appState,
    });
  }

  return (
    <>
      <Backdrop open={isOpen} onClick={closeOverlay} />
      <Sheet open={isOpen}>
        <ModalHeader
          title="Export Tokens"
          subtitle="Choose formats to export"
          actions={
            <Button variant="ghost" size="sm" label="Close" onClick={closeOverlay} />
          }
        />

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {EXPORT_FORMATS.map(({ format, label, description }) => {
            const selected = selectedFormats.has(format);
            return (
              <button
                key={format}
                onClick={() => toggleFormat(format)}
                className={[
                  'flex items-center justify-between px-3 py-2 rounded-[10px] border transition-colors text-left',
                  selected
                    ? 'border-accent bg-accent/10'
                    : 'border-border-base bg-bg-card hover:bg-bg-hover',
                ].join(' ')}
              >
                <div>
                  <p className="text-[13px] font-medium text-text-primary">{label}</p>
                  <p className="text-[11px] text-text-muted">{description}</p>
                </div>
                <div
                  className={[
                    'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                    selected ? 'bg-accent border-accent' : 'border-border-input',
                  ].join(' ')}
                >
                  {selected && <span className="text-white text-[10px] font-bold">✓</span>}
                </div>
              </button>
            );
          })}
        </div>

        <div className="shrink-0 px-3 py-3 border-t border-border-base">
          {building ? (
            <div className="flex items-center justify-center gap-2 py-2">
              <Spinner size="sm" />
              <span className="text-[12px] text-text-muted">Building package…</span>
            </div>
          ) : (
            <Button
              variant="primary"
              size="xl"
              label={`Export Selected (${selectedFormats.size})`}
              onClick={handleExport}
              disabled={selectedFormats.size === 0}
              className="w-full"
            />
          )}
        </div>
      </Sheet>
    </>
  );
}
