import { useState } from "react";
import { useUiStore } from "../store/uiStore";
import { useProjectStore } from "../store/projectStore";
import { toast } from "../store/toastStore";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Backdrop } from "../components/Backdrop";
import { Sheet } from "../components/Sheet";
import { ModalHeader } from "../components/Modal";
import { HelperText } from "../components/typography";

export function SaveVersionOverlay() {
  const isOpen = useUiStore((s) => s.activeOverlay === "save-version");
  const closeOverlay = useUiStore((s) => s.closeOverlay);
  const saveVersion = useProjectStore((s) => s.saveVersion);
  const reason = useProjectStore((s) => s.versionSaveBlockedReason());

  const [name, setName] = useState("");
  const [changelog, setChangelog] = useState("");

  function handleSave() {
    if (!name.trim()) return;
    const ok = saveVersion(name.trim(), changelog.trim());
    if (ok) {
      toast.success("Version saved");
      setName("");
      setChangelog("");
      closeOverlay();
    }
  }

  function handleClose() {
    setName("");
    setChangelog("");
    closeOverlay();
  }

  return (
    <>
      <Backdrop open={isOpen} onClick={handleClose} />
      <Sheet open={isOpen}>
        <ModalHeader title="Save Version" subtitle="Snapshot the current configuration as a named version." actions={<Button variant="ghost" size="sm" label="Close" onClick={handleClose} />} />

        {/* Form */}
        <div className="px-4 py-4 flex flex-col gap-3">
          <Input
            label="Version Name"
            size="lg"
            placeholder="e.g. v1.0 — Launch"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            surface="raised"
          />
          <Input
            label="Changelog"
            size="lg"
            placeholder="What changed in this version?"
            value={changelog}
            onChange={(e) => setChangelog(e.target.value)}
            surface="raised"
          />
          {reason && <HelperText>{reason}</HelperText>}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-n-br-subtle flex gap-2 shrink-0">
          <Button variant="secondary" size="md" label="Cancel" onClick={handleClose} className="flex-1" />
          <Button
            variant="primary"
            size="md"
            label="Save Version"
            onClick={handleSave}
            disabled={!name.trim() || !!reason}
            className="flex-1"
          />
        </div>
      </Sheet>
    </>
  );
}
