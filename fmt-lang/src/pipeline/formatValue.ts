// Pipeline stage 4 — FORMAT: per raw record, apply valueFormat + naming to
// produce a fully-resolved {name, value, ...} view (Part C). This is the
// one stage that turns raw data into display strings; everything before it
// (select/sort/arrange) worked on raw fields, everything after it
// (compose-entry/compose-block) works on these already-formatted strings.
import type { AnyRecord, TokenRecord, ScaleStepRecord, SourceColorRecord, SourceAlphaRecord } from "../data/shapes";
import type { NamingDef, SegmentKind } from "../lang/defs/naming";
import { renderName } from "../lang/defs/naming";
import type { ValueFormatDef } from "../lang/defs/valueFormat";
import { renderLiteralValue, renderRgbaValue, renderReference, type ReferenceStyle } from "../lang/defs/valueFormat";
import type { FormattedEntry } from "../lang/stdlib/entryPresets";

export interface ResolveNamingSegments {
  // "$segments" support (B.3): resolves against the Dataset's live
  // tokenNameSegments before naming ever runs — the caller (pipeline
  // orchestration) is responsible for this substitution, since only it
  // knows the real Dataset; formatValue.ts stays Dataset-agnostic.
  (def: NamingDef): SegmentKind[];
}

function formatTokenName(record: TokenRecord, def: NamingDef, resolveSegments: ResolveNamingSegments): string {
  const segments = resolveSegments(def);
  const identityByKind: Record<SegmentKind, { name: string; shorthand: string | null; segments: string[] } | undefined> = {
    color: record.data.color,
    role: record.data.role,
    variation: record.data.variation,
    step: undefined,
  };
  const segmentIdentities = segments
    .map((kind) => ({ kind, identity: identityByKind[kind] }))
    .filter((s): s is { kind: SegmentKind; identity: { name: string; shorthand: string | null; segments: string[] } } => s.identity !== undefined);
  return renderName(segmentIdentities, def);
}

function formatScaleStepName(record: ScaleStepRecord, def: NamingDef): string {
  return renderName(
    [
      { kind: "color", identity: record.data.color },
      { kind: "step", identity: { name: record.data.stepKey, shorthand: null, segments: [record.data.stepKey] } },
    ],
    def
  );
}

function formatSourceName(record: SourceColorRecord | SourceAlphaRecord, def: NamingDef): string {
  return renderName([{ kind: "color", identity: record.data.color }], def);
}

// tokenRefOrLiteral-style conditional valueFormat (B.4) is expressed as an
// ordinary ValueFormatDef with an optional `referenceStyle` escape hatch — a
// token whose tokenRef is set renders as a reference expression instead of
// its literal value, when a ReferenceStyle is supplied. The explicit
// `referenceStyle` parameter (still accepted for callers that build a
// ResolveNamingSegments-style pipeline directly against pipeline/stages.ts,
// e.g. the acceptance tests) takes priority when given; otherwise it falls
// back to valueFormatDef.referenceStyle — the document-facing field a real
// files[].valueFormat/defs.valueFormat.* entry actually sets.
export function formatValue(
  record: AnyRecord,
  namingDef: NamingDef,
  valueFormatDef: ValueFormatDef,
  resolveSegments: ResolveNamingSegments,
  referenceStyle?: ReferenceStyle
): FormattedEntry {
  const effectiveReferenceStyle = referenceStyle ?? valueFormatDef.referenceStyle;
  switch (record.__shape) {
    case "token": {
      const name = formatTokenName(record, namingDef, resolveSegments);
      const value = record.data.tokenRef && effectiveReferenceStyle
        ? renderReference(record.data.tokenRef, effectiveReferenceStyle)
        : renderLiteralValue(record.data.value, valueFormatDef);
      return { name, value, isAdjusted: record.data.isAdjusted };
    }
    case "scaleStep": {
      const name = formatScaleStepName(record, namingDef);
      return { name, value: renderLiteralValue(record.data.value, valueFormatDef), description: record.data.description };
    }
    case "sourceColor": {
      const name = formatSourceName(record, namingDef);
      // §2/B.4: source.value is ALWAYS raw hex, never run through
      // valueFormat — matches every real built-in's own base-entry
      // convention (confirmed against fmtCSS.ts/fmtDTCG.ts/
      // fmtStyleDictionary.ts, all of which write the source base entry as
      // literal hex and only convert alpha variants).
      return { name, value: `#${record.data.hex.replace(/^#/, "")}`, description: record.data.description };
    }
    case "sourceAlpha": {
      const name = `${formatSourceName(record, namingDef)}-alpha-${record.data.opacity}`;
      const value = valueFormatDef.kind === "rgba" || valueFormatDef.kind === "hsla"
        ? renderRgbaValue(record.data.rgba)
        : renderLiteralValue(`#${record.data.rgba.r.toString(16).padStart(2, "0")}${record.data.rgba.g.toString(16).padStart(2, "0")}${record.data.rgba.b.toString(16).padStart(2, "0")}`, valueFormatDef, record.data.rgba.a);
      return { name, value, description: record.data.description };
    }
  }
}
