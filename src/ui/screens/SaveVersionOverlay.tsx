import { useState } from "react";
import { createPortal } from "react-dom";
import { useUiStore } from "../store/uiStore";
import { useProjectStore } from "../store/projectStore";
import { toast } from "../store/toastStore";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { HelperText } from "../components/typography";
import { X } from "lucide-react";

export function SaveVersionOverlay() {
  const isOpen = useUiStore((s) => s.activeOverlay === "save-version");
  const closeOverlay = useUiStore((s) => s.closeOverlay);
  const saveVersion = useProjectStore((s) => s.saveVersion);
  const reason = useProjectStore((s) => s.versionSaveBlockedReason());

  const [name, setName] = useState("");
  const [changelog, setChangelog] = useState("");

  if (!isOpen) return null;

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

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0" style={{ background: "var(--bg-scrim)" }} onClick={handleClose} />
      <div className="relative z-10 flex flex-col bg-bg-panel rounded-t-[16px] border-t border-border-base">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between shrink-0">
          <div>
            <span className="text-[12px] font-semibold text-text-primary">Save Version</span>
            <p className="text-[10px] text-text-dim mt-0.5">Snapshot the current configuration as a named version.</p>
          </div>
          <button className="text-text-dim hover:text-text-primary cursor-pointer" onClick={handleClose}>
            <X size={13} />
          </button>
        </div>

        {/* Form */}
        <div className="px-4 py-4 flex flex-col gap-3">
          <Input
            label="Version Name"
            size="lg"
            placeholder="e.g. v1.0 — Launch"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <Input
            label="Changelog"
            size="lg"
            placeholder="What changed in this version?"
            value={changelog}
            onChange={(e) => setChangelog(e.target.value)}
          />
          {reason && <HelperText>{reason}</HelperText>}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border-subtle flex gap-2 shrink-0">
          <Button
            variant="primary"
            size="md"
            label="Save Version"
            onClick={handleSave}
            disabled={!name.trim() || !!reason}
            className="flex-1"
          />
          <Button variant="secondary" size="md" label="Cancel" onClick={handleClose} className="flex-1" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
