// The fixed 6-stage execution order (Part C) — orchestrates
// select/sort/arrange/format/composeEntry/composeBlock for ONE file
// definition's rendering. Every file[] entry's content goes through this,
// in this exact order, always:
//   1. SELECT   -> flat array of raw records
//   2. SORT     -> same array, ordered by raw fields (Dataset's canonical
//                  order if no sort def is given — the Determinism guarantee)
//   3. ARRANGE  -> grouped/nested structure over the sorted, still-raw records
//   4. FORMAT   -> (inside composeEntry, per record) raw -> {name, value, ...}
//   5. COMPOSE-ENTRY -> (inside composeEntry) entryFormat per record
//   6. COMPOSE-BLOCK -> assemble + static content + group headers + indent
import type { AnyRecord } from "../data/shapes";
import type { SelectDef } from "../lang/defs/select";
import { selectRecords, narrowSelection } from "../lang/defs/select";
import type { SortDef } from "../lang/defs/sort";
import { sortRecords } from "../lang/defs/sort";
import type { ArrangeDef } from "../lang/defs/arrange";
import { arrangeRecords } from "../lang/defs/arrange";
import type { ComposeOptions } from "./composeBlock";
import { composeBlock } from "./composeBlock";
import type { ExprContext } from "../lang/expr";
import { interpolateTemplate } from "../lang/expr";

export interface RenderFileInput {
  records: readonly AnyRecord[]; // already scoped to the right shape by the caller (Dataset access)
  select: SelectDef;
  additionalWhere?: string; // B.9's chaining — ANDed onto select's own where
  sort?: SortDef; // absent -> Dataset's own canonical order is used (records arrive pre-sorted)
  arrange: ArrangeDef;
  compose: ComposeOptions;
  before?: string;
  after?: string;
  exprContext?: ExprContext;
}

export function renderFile(input: RenderFileInput): string {
  // 1. SELECT
  let selected = selectRecords(input.records, input.select, input.exprContext ?? {});
  selected = narrowSelection(selected, input.additionalWhere, input.exprContext ?? {});

  // 2. SORT — if no sort def given, `selected` is already in the Dataset's
  // canonical deterministic order (never left to incidental array order).
  const sorted = input.sort ? sortRecords(selected, input.sort) : selected;

  // 3. ARRANGE
  const tree = arrangeRecords(sorted, input.arrange);

  // B.11's group-header/footer hooks — derived here from the arrange def's
  // OWN template fields (groupHeaderTemplate/groupFooterTemplate) into the
  // real callbacks composeBlock (stage 6) calls, since ArrangeDef is where
  // a document author declares them (they're conceptually "this nesting's
  // own decoration"), but ComposeOptions is where the pipeline actually
  // consumes a group-header hook. `group` is the implicit variable exposed
  // inside the template, per B.11's own wording.
  const compose: ComposeOptions = { ...input.compose };
  if (input.arrange.groupHeaderTemplate) {
    const tpl = input.arrange.groupHeaderTemplate;
    compose.onGroupStart = (group: string) => interpolateTemplate(tpl, { vars: { group } });
  }
  if (input.arrange.groupFooterTemplate) {
    const tpl = input.arrange.groupFooterTemplate;
    compose.onGroupEnd = (group: string) => interpolateTemplate(tpl, { vars: { group } });
  }

  // 4/5/6. FORMAT + COMPOSE-ENTRY + COMPOSE-BLOCK
  return composeBlock(tree, compose, input.before, input.after);
}
