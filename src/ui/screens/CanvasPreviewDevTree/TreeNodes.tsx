import type { ProjectStore, EngineResult, TokenEntry, ScaleStepToken } from "../../types/state";
import { normalizeHex } from "../../components/preview";
import { contrastRatioColor } from "../../utils/engine";
import { TreeRow, Field, FieldBlock, ContrastRow, type NodeStatus } from "./TreeRow";

// ── Tree leaf / branch nodes ──────────────────────────────────────────────────

export function ScaleStepNode({ stepKey, step, depth }: { stepKey: string; step: ScaleStepToken; depth: number }) {
  const hex = step.value;
  return (
    <TreeRow depth={depth} label={stepKey} hex={hex} defaultOpen={false} meta={<span style={{ fontSize: 9, fontFamily: "monospace", color: "#71717a" }}>{normalizeHex(hex)}</span>}>
      <FieldBlock depth={depth}>
        <Field label="value" value={normalizeHex(hex)} mono color="#c4b5fd" />
        <Field label="stepName" value={step.stepName} mono />
        <Field label="shorthand" value={step.shorthand} mono />
        {step.description && <Field label="description" value={step.description} />}
        {Object.entries(step.contrast).map(([k, c]) => (
          <ContrastRow key={k} themeKey={k} ratio={c.ratio} rating={c.rating} />
        ))}
      </FieldBlock>
    </TreeRow>
  );
}

export function TokenEntryNode({ varName, token, depth, warnings, notices }: { varName: string; token: TokenEntry; depth: number; warnings: EngineResult["errors"]["warnings"]; notices: EngineResult["errors"]["notices"] }) {
  const ratio = token.contrast.ratio;
  const myWarnings = warnings.filter((w) => w.variation === token.variation && w.role === token.role);
  const myNotices = notices.filter((n) => n.variation === token.variation && n.role === token.role);

  const status: NodeStatus = myWarnings.length > 0 ? "warn" : token.isAdjusted ? "adjusted" : myNotices.length > 0 ? "notice" : "ok";

  return (
    <TreeRow
      depth={depth}
      label={varName}
      hex={token.value}
      status={status}
      defaultOpen={false}
      tag={token.isAdjusted ? "adjusted" : undefined}
      meta={<span style={{ fontSize: 9, fontFamily: "monospace", color: contrastRatioColor(ratio) }}>{ratio != null ? `${ratio.toFixed(1)}:1` : "—"}</span>}
    >
      <FieldBlock depth={depth}>
        <Field label="value" value={normalizeHex(token.value)} mono color="#fcd34d" />
        <Field label="tokenName" value={token.tokenName} mono />
        <Field label="tokenRef" value={token.tokenRef ?? "—"} mono />
        <Field label="variation" value={token.variation} />
        <Field label="role" value={token.role} />
        <Field label="color" value={token.color} />
        {token.roleDescription && <Field label="roleDescription" value={token.roleDescription} />}
        {token.contrastTarget != null && <Field label="contrastTarget" value={`${token.contrastTarget}:1`} mono color={ratio != null && ratio >= token.contrastTarget ? "#34d399" : "#f87171"} />}
        <ContrastRow themeKey="bg" ratio={ratio} rating={token.contrast.rating} />
        {token.isAdjusted && <Field label="isAdjusted" value="true — engine fell back to closest available step" color="#a78bfa" />}
        {myWarnings.map((w, i) => (
          <Field key={i} label={`warning ${i + 1}`} value={w.warning} color="#fbbf24" />
        ))}
        {myNotices.map((n, i) => (
          <Field key={i} label={`notice ${i + 1}`} value={n.notice} color="#60a5fa" />
        ))}
      </FieldBlock>
    </TreeRow>
  );
}

export function RoleNode({
  roleName,
  roleIdx,
  varMap,
  depth,
  projectStore,
  result,
  colorName,
  themeName,
}: {
  roleName: string;
  roleIdx: number;
  varMap: Record<number, TokenEntry>;
  depth: number;
  projectStore: ProjectStore;
  result: EngineResult;
  colorName: string;
  themeName: string;
}) {
  const entries = Object.entries(varMap);
  const roleObj = projectStore.roles[roleIdx];
  const varDefs = roleObj?.variations ?? projectStore.variations ?? [];

  const hasWarn = result.errors.warnings.some((w) => w.role === roleName && w.color === colorName && w.theme === themeName);
  const hasAdjusted = entries.some(([, t]) => t.isAdjusted);
  const hasNotice = result.errors.notices.some((n) => n.role === roleName && n.color === colorName && n.theme === themeName);
  const status: NodeStatus = hasWarn ? "warn" : hasAdjusted ? "adjusted" : hasNotice ? "notice" : "ok";
  const firstHex = entries.find(([, t]) => t.value)?.[1]?.value;

  return (
    <TreeRow depth={depth} label={roleName} hex={firstHex} status={status} defaultOpen={false} tag={`${entries.length} var${entries.length !== 1 ? "s" : ""}`}>
      {entries.map(([varIdxStr, token]) => {
        const varDef = varDefs[parseInt(varIdxStr, 10)];
        return (
          <TokenEntryNode
            key={varIdxStr}
            varName={varDef?.name ?? `var-${varIdxStr}`}
            token={token}
            depth={depth + 1}
            warnings={result.errors.warnings.filter((w) => w.color === colorName && w.role === roleName && w.theme === themeName)}
            notices={result.errors.notices.filter((n) => n.color === colorName && n.role === roleName && n.theme === themeName)}
          />
        );
      })}
    </TreeRow>
  );
}

export function ThemeColorNode({
  colorName,
  roleMap,
  depth,
  projectStore,
  result,
  themeName,
  visibleRoles,
}: {
  colorName: string;
  roleMap: Record<number, Record<number, TokenEntry>>;
  depth: number;
  projectStore: ProjectStore;
  result: EngineResult;
  themeName: string;
  visibleRoles: Set<string> | null;
}) {
  const colorObj = projectStore.colors.find((c) => c.name === colorName);
  const roleEntries = Object.entries(roleMap).filter(([roleIdxStr]) => {
    if (!visibleRoles) return true;
    const roleObj = projectStore.roles[parseInt(roleIdxStr, 10)];
    return roleObj && visibleRoles.has(roleObj.name);
  });
  const tokenCount = roleEntries.reduce((acc, [, vm]) => acc + Object.keys(vm).length, 0);

  const hasWarn = result.errors.warnings.some((w) => w.color === colorName && w.theme === themeName);
  const hasAdjusted = roleEntries.some(([, vm]) => Object.values(vm).some((t) => t.isAdjusted));
  const status: NodeStatus = hasWarn ? "warn" : hasAdjusted ? "adjusted" : "ok";

  if (roleEntries.length === 0) return null;

  return (
    <TreeRow depth={depth} label={colorName} hex={colorObj?.value} status={status} defaultOpen={false} tag={`${tokenCount} token${tokenCount !== 1 ? "s" : ""}`}>
      {roleEntries.map(([roleIdxStr, varMap]) => {
        const roleIdx = parseInt(roleIdxStr, 10);
        const roleObj = projectStore.roles[roleIdx];
        return <RoleNode key={roleIdxStr} roleName={roleObj?.name ?? `role-${roleIdx}`} roleIdx={roleIdx} varMap={varMap} depth={depth + 1} projectStore={projectStore} result={result} colorName={colorName} themeName={themeName} />;
      })}
    </TreeRow>
  );
}
