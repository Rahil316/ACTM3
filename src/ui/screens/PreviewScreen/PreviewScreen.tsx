import { useUiStore } from "../../store/uiStore";
import { Modal, ModalHeader } from "../../components/Modal";
import { Button } from "../../components/Button";
import { PreviewContent } from "./PreviewContent";

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
