import { useUiStore } from "../../store/uiStore";
import { Modal, ModalHeader } from "../../components/Modal";
import { Button } from "../../components/Button";
import { PreviewContent } from "./PreviewContent";

// Below this width the preview takes the whole plugin window as a modal;
// at/above it there's enough room to dock it as a side panel next to the
// editor instead (see App.tsx SIDE_PANEL_MIN_WIDTH).
export const SIDE_PANEL_MIN_WIDTH = 920;

export function PreviewScreen() {
  const isOpen = useUiStore((s) => s.activeOverlay === "preview");
  const closeOverlay = useUiStore((s) => s.closeOverlay);

  if (!isOpen) return null;

  return (
    <Modal open layer="overlay">
      <ModalHeader title="Preview" subtitle="Live token and color scale preview." actions={<Button variant="secondary" size="md" label="Close" onClick={closeOverlay} />} />
      <div className="flex-1 overflow-hidden flex flex-col">
        <PreviewContent />
      </div>
    </Modal>
  );
}

// Docked variant rendered inline by App.tsx when the window is wide enough —
// same content, no Modal/overlay chrome (App owns the surrounding layout).
export function PreviewSidePanel() {
  const closeOverlay = useUiStore((s) => s.closeOverlay);

  return (
    <div className="flex flex-col h-full border-l border-n-br-default bg-n-bg-app">
      <ModalHeader title="Preview" subtitle="Live token and color scale preview." actions={<Button variant="secondary" size="md" label="Close" onClick={closeOverlay} />} />
      <div className="flex-1 overflow-hidden flex flex-col">
        <PreviewContent />
      </div>
    </div>
  );
}
