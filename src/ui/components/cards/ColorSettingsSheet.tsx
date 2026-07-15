import { createPortal } from "react-dom";
import { LucideClose as X } from "../icons";
import { Checkbox } from "../Checkbox";
import { useProjectStore } from "../../store/projectStore";

// Second entry point onto Role.scopedColorIds (see RoleSettingsSheet's "Colors"
// tab for the role-side view of the same relationship) — lets a color exclude
// itself from specific roles instead of a role excluding specific colors.
// Both views edit the same underlying field, so there is nothing to keep "in
// sync": toggling here writes directly into the affected role's scopedColorIds.
export function ColorSettingsSheet({ colorIdx, onClose }: { colorIdx: number; onClose: () => void }) {
  const color = useProjectStore((s) => s.projectStore.colors[colorIdx]);
  const roles = useProjectStore((s) => s.projectStore.roles);
  const setColorRoleInclusion = useProjectStore((s) => s.setColorRoleInclusion);

  if (!color) return null;
  const colorId = color._id ?? "";

  function isIncluded(roleIdx: number): boolean {
    const scopedColorIds = roles[roleIdx].scopedColorIds;
    return scopedColorIds == null || scopedColorIds.includes(colorId);
  }

  function toggleRole(roleIdx: number) {
    setColorRoleInclusion(colorId, roleIdx, !isIncluded(roleIdx));
  }

  const allIncluded = roles.every((_, ri) => isIncluded(ri));
  function toggleAll() {
    const next = !allIncluded;
    roles.forEach((_, ri) => {
      if (isIncluded(ri) !== next) setColorRoleInclusion(colorId, ri, next);
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0" style={{ background: "var(--n-sf-overlay)", opacity: 0.7 }} onClick={onClose} />
      <div className="relative z-10 h-[72%] flex flex-col bg-n-bg-panel rounded-t-[16px] border-t border-n-br-default">
        {/* Header */}
        <div className="px-4 py-3 border-b border-n-br-subtle flex items-center justify-between shrink-0">
          <span className="text-[12px] font-semibold text-n-tx-primary">Color Settings</span>
          <button className="text-n-tx-dim hover:text-n-tx-primary cursor-pointer" onClick={onClose}>
            <X size={13} />
          </button>
        </div>

        {/* Roles tab — only tab for now */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="flex flex-col">
            <div className="px-4 py-2.5">
              <p className="text-[11px] text-n-tx-dim">Limit which roles generate tokens for this color.</p>
            </div>
            {roles.length === 0 ? (
              <div className="px-4 py-2.5 text-[12px] text-n-tx-dim">No roles yet.</div>
            ) : (
              <>
                <button onClick={toggleAll} className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-n-sf-hover transition-colors cursor-pointer border-b border-n-br-subtle">
                  <Checkbox checked={allIncluded} />
                  <span className="text-[12px] font-medium text-n-tx-primary">All roles</span>
                </button>
                {roles.map((role, ri) => (
                  <button key={role._id ?? ri} onClick={() => toggleRole(ri)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-n-sf-hover transition-colors cursor-pointer border-b border-n-br-subtle last:border-0">
                    <Checkbox checked={isIncluded(ri)} />
                    <span className="text-[12px] text-n-tx-primary">{role.name}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
