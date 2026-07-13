import type { ProjectStore, TokenEntry } from "../../types/state";
import { RatingBadge, getInkMode, inkColor, normalizeHex, copyText } from "../../components/preview";

// ── Table section ─────────────────────────────────────────────────────────────

// ── Shared token row ──────────────────────────────────────────────────────────

export const TABLE_COL = "minmax(80px,1fr) 64px 56px 48px minmax(120px,2fr)";

function TokenRow({ token, varLabel, ink }: { token: TokenEntry; varLabel: string; ink: "light" | "dark" }) {
  const ratioStr = typeof token.contrast?.ratio === "number" ? token.contrast.ratio.toFixed(1) : "—";
  return (
    <div
      className="grid items-center h-9 cursor-pointer hover:opacity-80 transition-opacity"
      style={{ gridTemplateColumns: TABLE_COL, borderTop: `1px solid ${inkColor(ink, 0.06)}` }}
      onClick={() => copyText(token.value, "hex")}
      title={`${token.value.toUpperCase()} — click to copy hex`}
    >
      <div className="px-3 flex items-center gap-1.5 min-w-0">
        <div className="w-3.5 h-3.5 rounded-[3px] shrink-0" style={{ background: token.value, boxShadow: `0 0 0 1px ${inkColor(ink, 0.12)}` }} />
        <span className="text-[11px] font-semibold truncate" style={{ color: inkColor(ink, 0.85) }}>{varLabel}</span>
      </div>
      <div className="px-2 min-w-0">
        <span className="text-[10px] font-mono font-semibold tracking-[0.04em]" style={{ color: token.value }}
          onClick={(e) => { e.stopPropagation(); copyText(token.value, "hex"); }}>
          {token.value.toUpperCase()}
        </span>
      </div>
      <div className="px-2">
        <span className="text-[12px] font-bold tabular-nums" style={{ color: inkColor(ink, 0.8) }}>{ratioStr}</span>
      </div>
      <div className="px-2">
        <RatingBadge rating={token.contrast?.rating ?? "Fail"} />
      </div>
      <div className="px-2 min-w-0">
        {token.tokenName ? (
          <span className="text-[10px] font-mono truncate block cursor-pointer hover:underline" style={{ color: inkColor(ink, 0.45) }}
            onClick={(e) => { e.stopPropagation(); copyText(token.tokenName, "token name"); }}
            title={`${token.tokenName} — click to copy`}>
            {token.tokenName}
          </span>
        ) : (
          <span className="text-[10px]" style={{ color: inkColor(ink, 0.2) }}>—</span>
        )}
      </div>
    </div>
  );
}

// ── Token table section ───────────────────────────────────────────────────────
// groupAxis="color": color is top-level header, roles are sub-headers
// groupAxis="role":  role is top-level header, colors are sub-headers

type ColorGroupAxis = {
  groupAxis: "color";
  srcHex: string;
  roles: Record<number, Record<number, TokenEntry>>;
};
type RoleGroupAxis = {
  groupAxis: "role";
  roleName: string;
  colorMap: Record<string, Record<number, TokenEntry>>;
};
type TokenTableSectionProps = (ColorGroupAxis | RoleGroupAxis) & { projectStore: ProjectStore; ink: "light" | "dark" };

export function TokenTableSection(props: TokenTableSectionProps) {
  const { projectStore, ink } = props;
  const variations = projectStore.variations ?? [];

  if (props.groupAxis === "color") {
    const { srcHex, roles } = props;
    const hdrInk = getInkMode(srcHex);
    return (
      <div className="rounded-[10px] overflow-hidden" style={{ border: `1px solid ${inkColor(ink, 0.1)}` }}>
        <div className="grid items-center h-8 sticky top-0 z-10" style={{ background: srcHex, gridTemplateColumns: TABLE_COL }}>
          {(["Token", "Hex", "Ratio", "WCAG", "Token Name"] as const).map((h, i) => (
            <div key={h} className="px-2 text-[10px] font-bold tracking-[0.07em] uppercase truncate" style={{ color: inkColor(hdrInk, 0.75), paddingLeft: i === 0 ? 12 : undefined }}>{h}</div>
          ))}
        </div>
        {Object.entries(roles).map(([roleIdxStr, vars]) => {
          const roleIdx = parseInt(roleIdxStr);
          const role = projectStore.roles[roleIdx];
          if (!role) return null;
          const roleVars = role.variations ?? variations;
          return (
            <div key={roleIdx}>
              <div className="h-[26px] flex items-center px-4" style={{ background: inkColor(ink, 0.05), borderTop: `1px solid ${inkColor(ink, 0.08)}` }}>
                <span className="text-[10px] font-bold tracking-[0.06em] uppercase truncate" style={{ color: inkColor(ink, 0.5) }}>{role.name}</span>
              </div>
              {Object.entries(vars).map(([varIdxStr, token]) => {
                const v = roleVars[parseInt(varIdxStr)];
                return <TokenRow key={varIdxStr} token={token} varLabel={v ? v.shorthand || v.name : varIdxStr} ink={ink} />;
              })}
            </div>
          );
        })}
      </div>
    );
  }

  const { roleName, colorMap } = props;
  const role = projectStore.roles.find((r) => r.name === roleName);
  const roleVars = role?.variations ?? variations;
  return (
    <div className="rounded-[10px] overflow-hidden" style={{ border: `1px solid ${inkColor(ink, 0.1)}` }}>
      <div className="grid items-center h-8 sticky top-0 z-10" style={{ background: inkColor(ink, 0.12), gridTemplateColumns: TABLE_COL }}>
        {(["Role / Color", "Hex", "Ratio", "WCAG", "Token Name"] as const).map((h, i) => (
          <div key={h} className="px-2 text-[10px] font-bold tracking-[0.07em] uppercase truncate" style={{ color: inkColor(ink, 0.75), paddingLeft: i === 0 ? 12 : undefined }}>
            {i === 0 ? roleName : h}
          </div>
        ))}
      </div>
      {Object.entries(colorMap).map(([colorName, vars]) => {
        const cHex = normalizeHex(projectStore.colors.find((c) => c.name === colorName)?.value ?? "888888");
        return (
          <div key={colorName}>
            <div className="h-[26px] flex items-center gap-2 px-4" style={{ background: inkColor(ink, 0.05), borderTop: `1px solid ${inkColor(ink, 0.08)}` }}>
              <div className="w-2.5 h-2.5 rounded-[2px] shrink-0" style={{ background: cHex }} />
              <span className="text-[10px] font-bold tracking-[0.06em] uppercase truncate" style={{ color: inkColor(ink, 0.5) }}>{colorName}</span>
            </div>
            {Object.entries(vars).map(([varIdxStr, token]) => {
              const v = roleVars[parseInt(varIdxStr)];
              return <TokenRow key={varIdxStr} token={token} varLabel={v ? v.shorthand || v.name : varIdxStr} ink={ink} />;
            })}
          </div>
        );
      })}
    </div>
  );
}
