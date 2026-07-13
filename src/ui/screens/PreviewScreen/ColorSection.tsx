import type { ProjectStore, TokenEntry } from "../../types/state";
import { TokenTile, inkColor } from "../../components/preview";

// ── Color section (grid mode) ─────────────────────────────────────────────────

interface ColorSectionProps {
  colorName: string;
  srcHex: string;
  roles: Record<number, Record<number, TokenEntry>>;
  projectStore: ProjectStore;
  ink: "light" | "dark";
}

export function ColorSection({ colorName, srcHex, roles, projectStore, ink }: ColorSectionProps) {
  const variations = projectStore.variations ?? [];

  return (
    <div className="rounded-[14px] p-4" style={{ border: `1px solid ${inkColor(ink, 0.1)}`, background: inkColor(ink, 0.03) }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 rounded-[3px] shrink-0" style={{ background: srcHex, boxShadow: `0 0 0 1px ${inkColor(ink, 0.12)}` }} />
        <span className="text-[13px] font-bold" style={{ color: inkColor(ink) }}>
          {colorName}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {Object.entries(roles).map(([roleIdxStr, vars]) => {
          const roleIdx = parseInt(roleIdxStr);
          const role = projectStore.roles[roleIdx];
          if (!role) return null;
          const roleVars = role.variations ?? variations;

          return (
            <div key={roleIdx} className="flex flex-col gap-2">
              <span className="text-[12px] font-bold truncate" style={{ color: inkColor(ink, 0.9) }}>
                {role.name}
              </span>
              <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(88px,1fr))" }}>
                {Object.entries(vars).map(([varIdxStr, token]) => {
                  const varIdx = parseInt(varIdxStr);
                  const v = roleVars[varIdx];
                  const varLabel = v ? v.shorthand || v.name : String(varIdx);
                  return <TokenTile key={varIdxStr} hex={token.value} ratio={token.contrast?.ratio ?? null} rating={token.contrast?.rating ?? "Fail"} varLabel={varLabel} tokenName={token.tokenName} ink={ink} />;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
