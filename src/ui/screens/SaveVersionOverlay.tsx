import { useUiStore } from '../store/uiStore';
import { Modal, ModalHeader } from '../components/Modal';
import { Button } from '../components/Button';
import { SaveVersionForm } from './ProjectScreen';

export function SaveVersionOverlay() {
  const isOpen      = useUiStore((s) => s.activeOverlay === 'save-version');
  const closeOverlay = useUiStore((s) => s.closeOverlay);

  if (!isOpen) return null;

  return (
    <Modal open layer="dialog">
      <ModalHeader
        title="Save State"
        subtitle="Snapshot the current configuration as a named version."
        actions={<Button variant="secondary" size="md" label="Cancel" onClick={closeOverlay} />}
      />
      <div className="p-3">
        <SaveVersionForm onSaved={closeOverlay} />
      </div>
    </Modal>
  );
}
