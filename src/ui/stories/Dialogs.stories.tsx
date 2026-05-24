import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Modal, ModalHeader } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Dialogue } from '../components/Dialogue';
import { Backdrop } from '../components/Backdrop';
import { Button } from '../components/Button';
import { IconSettings } from '../components/icons';

const meta: Meta = {
  title: 'Components/Dialogs',
  tags: ['autodocs'],
};
export default meta;

export const AllDialogs: StoryObj = {
  render: () => {
    const [modalOpen, setModalOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [dialogueRowOpen, setDialogueRowOpen] = useState(false);
    const [dialogueStackedOpen, setDialogueStackedOpen] = useState(false);
    const [dialogueSheetOpen, setDialogueSheetOpen] = useState(false);
    const [backdropOpen, setBackdropOpen] = useState(false);

    return (
      <div className="flex flex-col gap-3 p-4 max-w-sm bg-bg-app rounded-lg border border-border-base relative min-h-[360px] justify-center items-center">
        <h4 className="text-text-muted text-[11px] uppercase tracking-wider font-bold mb-2">Dialogs & Overlays</h4>

        <Button variant="secondary" size="md" className="w-full" label="Open Modal Screen" onClick={() => setModalOpen(true)} />
        <Button variant="secondary" size="md" className="w-full" label="Open Confirm Dialog" onClick={() => setConfirmOpen(true)} />
        <Button variant="secondary" size="md" className="w-full" label="Open Dialogue (Row)" onClick={() => setDialogueRowOpen(true)} />
        <Button variant="secondary" size="md" className="w-full" label="Open Dialogue (Stacked)" onClick={() => setDialogueStackedOpen(true)} />
        <Button variant="secondary" size="md" className="w-full" label="Open Dialogue (Bottom Sheet)" onClick={() => setDialogueSheetOpen(true)} />
        <Button variant="secondary" size="md" className="w-full" label="Toggle Backdrop" onClick={() => setBackdropOpen(true)} />

        {/* Modal Overlay */}
        <Modal open={modalOpen}>
          <ModalHeader
            title="Settings Overlay"
            subtitle="Configure your plugins settings and design tokens"
            actions={<Button variant="primary" size="sm" label="Close" onClick={() => setModalOpen(false)} />}
          />
          <div className="p-4 flex-1 overflow-y-auto flex flex-col items-center justify-center text-text-muted">
            <p>This is the content area of a full-screen Modal overlay.</p>
          </div>
        </Modal>

        {/* Confirm Dialog */}
        <ConfirmDialog
          open={confirmOpen}
          title="Delete Version?"
          body="Are you sure you want to delete this state version? This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={() => {
            alert('Deleted!');
            setConfirmOpen(false);
          }}
          onCancel={() => setConfirmOpen(false)}
        />

        {/* Dialogue (Row) */}
        <Dialogue
          open={dialogueRowOpen}
          title="Unsaved Changes"
          body="You have unsaved changes in settings. Do you want to save them?"
          buttons={[
            { label: 'Discard', action: () => alert('Discarded') },
            { label: 'Save', variant: 'primary', action: () => alert('Saved') }
          ]}
          layout="row"
          onClose={() => setDialogueRowOpen(false)}
        />

        {/* Dialogue (Stacked) */}
        <Dialogue
          open={dialogueStackedOpen}
          title="Load Preset Theme"
          body="Loading a preset will replace all your current colors and roles configurations."
          icon={<IconSettings className="w-8 h-8 text-yellow-500" />}
          buttons={[
            { label: 'Cancel', action: () => {} },
            { label: 'Load Preset', variant: 'primary', action: () => alert('Preset loaded') }
          ]}
          layout="stacked"
          onClose={() => setDialogueStackedOpen(false)}
        />

        {/* Dialogue (Bottom Sheet) */}
        <Dialogue
          open={dialogueSheetOpen}
          title="Select Export Format"
          body="Choose which CSS framework format to compile your design variables for."
          buttons={[
            { label: 'Export CSS variables', action: () => alert('Exporting CSS...') },
            { label: 'Export Tailwind config', action: () => alert('Exporting Tailwind...') },
            { label: 'Cancel', variant: 'ghost' }
          ]}
          layout="bottom-sheet"
          onClose={() => setDialogueSheetOpen(false)}
        />

        {/* Backdrop (renders overlay with click-to-close) */}
        <Backdrop open={backdropOpen} onClick={() => setBackdropOpen(false)} />
        {backdropOpen && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-bg-card p-4 rounded-lg border border-border-base text-center shadow-lg pointer-events-auto">
            <p className="text-text-primary mb-3">Backdrop is active!</p>
            <Button variant="primary" size="sm" label="Click to close" onClick={() => setBackdropOpen(false)} />
          </div>
        )}
      </div>
    );
  },
};
