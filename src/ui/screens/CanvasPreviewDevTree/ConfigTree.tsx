import type { ProjectStore } from "../../types/state";
import { TreeRow, Field, FieldBlock } from "./TreeRow";

// ── Config tree ───────────────────────────────────────────────────────────────

export function ConfigTree({ config, expandAll }: { config: ProjectStore; expandAll: boolean }) {
  return (
    <TreeRow depth={0} label="Config" defaultOpen={expandAll} tag={`${config.colors.length}c · ${config.roles.length}r · ${config.themes.length}t`}>
      {/* Global settings */}
      <TreeRow depth={1} label="Global" defaultOpen={expandAll}>
        <FieldBlock depth={1}>
          <Field label="pluginMode" value={config.pluginMode} />
          <Field label="scaleAlgorithm" value={config.scaleAlgorithm} />
          <Field label="scaleLength" value={String(config.scaleLength)} mono />
          <Field label="solverMode" value={config.solverMode ?? "—"} />
          <Field label="useUniformAlgorithm" value={String(config.useUniformAlgorithm ?? false)} />
          <Field label="algorithmScopeLevel" value={config.algorithmScopeLevel ?? "—"} />
          {config.scaleSteps && config.scaleSteps.length > 0 && <Field label="scaleSteps" value={config.scaleSteps.join(", ")} mono />}
        </FieldBlock>
      </TreeRow>

      {/* Colors */}
      <TreeRow depth={1} label="Colors" defaultOpen={expandAll} tag={`${config.colors.length}`}>
        {config.colors.map((c) => (
          <TreeRow key={c._id ?? c.name} depth={2} label={c.name} hex={c.value} defaultOpen={expandAll}>
            <FieldBlock depth={2}>
              <Field label="value" value={c.value} mono color="#c4b5fd" />
              <Field label="shorthand" value={c.shorthand || "—"} mono />
              <Field label="scaleAlgorithm" value={c.scaleAlgorithm ?? "inherited"} />
              <Field label="solverMode" value={c.solverMode ?? "inherited"} />
              {c.description && <Field label="description" value={c.description} />}
              {c._id && <Field label="_id" value={c._id} mono />}
            </FieldBlock>
          </TreeRow>
        ))}
      </TreeRow>

      {/* Themes */}
      <TreeRow depth={1} label="Themes" defaultOpen={expandAll} tag={`${config.themes.length}`}>
        {config.themes.map((t) => (
          <TreeRow key={t.name} depth={2} label={t.name} hex={t.bg} defaultOpen={false}>
            <FieldBlock depth={2}>
              <Field label="bg" value={t.bg} mono color="#86efac" />
            </FieldBlock>
          </TreeRow>
        ))}
      </TreeRow>

      {/* Roles */}
      <TreeRow depth={1} label="Roles" defaultOpen={expandAll} tag={`${config.roles.length}`}>
        {config.roles.map((r, i) => (
          <TreeRow key={r.name + i} depth={2} label={r.name} defaultOpen={false}>
            <FieldBlock depth={2}>
              <Field label="shorthand" value={r.shorthand || "—"} mono />
              <Field label="mappingMethod" value={r.mappingMethod ?? "contrast"} />
              <Field label="solverMode" value={r.solverMode ?? "inherited"} />
              <Field label="scaleAlgorithm" value={r.scaleAlgorithm ?? "inherited"} />
              {r.description && <Field label="description" value={r.description} />}
              {r.variations && <Field label="variations" value={r.variations.map((v) => `${v.name}(${v.target})`).join(", ")} />}
              {r.scopedColorIds && r.scopedColorIds.length > 0 && <Field label="scopedColorIds" value={r.scopedColorIds.join(", ")} mono />}
              {r.localBg && (
                <Field
                  label="localBg"
                  value={Object.entries(r.localBg)
                    .map(([k, v]) => `${k}:${v}`)
                    .join(", ")}
                  mono
                />
              )}
            </FieldBlock>
          </TreeRow>
        ))}
      </TreeRow>

      {/* Variations */}
      <TreeRow depth={1} label="Variations" defaultOpen={expandAll} tag={`${config.variations?.length}`}>
        {config.variations?.map((v, i) => (
          <TreeRow key={v.name + i} depth={2} label={v.name} defaultOpen={false}>
            <FieldBlock depth={2}>{v.shorthand && <Field label="shorthand" value={v.shorthand} mono />}</FieldBlock>
          </TreeRow>
        ))}
      </TreeRow>
    </TreeRow>
  );
}
