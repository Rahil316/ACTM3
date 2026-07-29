// The embedded expression language (B.1) — a small, deliberately non-JS
// grammar (see the plan's B.1 for why: trust, no sandbox needed, early
// static validation). Supports: field access (dot paths, e.g.
// `record.color.name`, `contrast.ratio`), string/number/boolean literals,
// comparisons (== != < <= > >=), boolean operators (&& ||), unary !, a
// ternary (cond ? a : b), and a small set of named built-in functions.
//
// B.1a's rule: any comparison/operation involving null/undefined never
// throws — it evaluates to false (for comparisons) or propagates null
// (for field access chains), so a field that happens to be null on one
// record never aborts generation.

export interface ExprContext {
  record?: unknown;
  // Additional named values available in scope (e.g. `theme` inside a
  // repeatFor body, `group` inside arrange hooks) — see pipeline usage.
  vars?: Record<string, unknown>;
}

// ── Tokenizer ────────────────────────────────────────────────────────────

type TokenKind = "ident" | "number" | "string" | "punct" | "eof";
interface Token { kind: TokenKind; value: string; pos: number }

const PUNCTUATORS = ["==", "!=", "<=", ">=", "&&", "||", "(", ")", ".", ",", "?", ":", "!", "<", ">", "+", "-", "*", "/"];

export class ExprSyntaxError extends Error {
  constructor(message: string, public pos: number) {
    super(message);
  }
}

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "'" || c === '"') {
      const quote = c;
      let j = i + 1;
      let out = "";
      while (j < src.length && src[j] !== quote) {
        if (src[j] === "\\" && j + 1 < src.length) { out += src[j + 1]; j += 2; continue; }
        out += src[j]; j++;
      }
      if (j >= src.length) throw new ExprSyntaxError(`Unterminated string literal starting at position ${i}`, i);
      tokens.push({ kind: "string", value: out, pos: i });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      tokens.push({ kind: "number", value: src.slice(i, j), pos: i });
      i = j;
      continue;
    }
    if (/[a-zA-Z_$]/.test(c)) {
      let j = i;
      while (j < src.length && /[a-zA-Z0-9_$]/.test(src[j])) j++;
      tokens.push({ kind: "ident", value: src.slice(i, j), pos: i });
      i = j;
      continue;
    }
    // Try 2-char punctuators first, then 1-char.
    const two = src.slice(i, i + 2);
    if (PUNCTUATORS.includes(two)) { tokens.push({ kind: "punct", value: two, pos: i }); i += 2; continue; }
    const one = src[i];
    if (PUNCTUATORS.includes(one)) { tokens.push({ kind: "punct", value: one, pos: i }); i += 1; continue; }
    throw new ExprSyntaxError(`Unexpected character '${c}' at position ${i}`, i);
  }
  tokens.push({ kind: "eof", value: "", pos: src.length });
  return tokens;
}

// ── Parser (recursive descent, precedence climbing) + evaluator combined ──
// Parses and evaluates in one pass — the expression language is small
// enough that a real AST isn't needed yet; Phase 4 (validation) can add a
// pure-parse pass over this same grammar if static analysis needs an AST
// without evaluating.

class Parser {
  private pos = 0;
  constructor(private tokens: Token[], private ctx: ExprContext) {}

  private peek(): Token { return this.tokens[this.pos]; }
  private next(): Token { return this.tokens[this.pos++]; }
  private expectPunct(p: string): void {
    const t = this.next();
    if (t.kind !== "punct" || t.value !== p) throw new ExprSyntaxError(`Expected '${p}' but found '${t.value || "<eof>"}' at position ${t.pos}`, t.pos);
  }

  parseExpression(): unknown {
    const v = this.parseTernary();
    if (this.peek().kind !== "eof") throw new ExprSyntaxError(`Unexpected trailing input at position ${this.peek().pos}`, this.peek().pos);
    return v;
  }

  private parseTernary(): unknown {
    const cond = this.parseOr();
    if (this.peek().kind === "punct" && this.peek().value === "?") {
      this.next();
      const whenTrue = this.parseTernary();
      this.expectPunct(":");
      const whenFalse = this.parseTernary();
      return isTruthy(cond) ? whenTrue : whenFalse;
    }
    return cond;
  }

  private parseOr(): unknown {
    let left = this.parseAnd();
    while (this.peek().kind === "punct" && this.peek().value === "||") {
      this.next();
      const right = this.parseAnd();
      left = isTruthy(left) ? left : right;
    }
    return left;
  }

  private parseAnd(): unknown {
    let left = this.parseComparison();
    while (this.peek().kind === "punct" && this.peek().value === "&&") {
      this.next();
      const right = this.parseComparison();
      left = isTruthy(left) ? right : left;
    }
    return left;
  }

  private parseComparison(): unknown {
    const left = this.parseAdditive();
    const t = this.peek();
    if (t.kind === "punct" && ["==", "!=", "<", "<=", ">", ">="].includes(t.value)) {
      this.next();
      const right = this.parseAdditive();
      return compare(t.value, left, right);
    }
    return left;
  }

  private parseAdditive(): unknown {
    let left = this.parseUnary();
    while (this.peek().kind === "punct" && (this.peek().value === "+" || this.peek().value === "-")) {
      const op = this.next().value;
      const right = this.parseUnary();
      if (op === "+") {
        left = (typeof left === "string" || typeof right === "string") ? String(left ?? "") + String(right ?? "") : numOrNull(left)! + numOrNull(right)!;
      } else {
        left = numOrNull(left)! - numOrNull(right)!;
      }
    }
    return left;
  }

  private parseUnary(): unknown {
    if (this.peek().kind === "punct" && this.peek().value === "!") {
      this.next();
      return !isTruthy(this.parseUnary());
    }
    return this.parsePostfix();
  }

  private parsePostfix(): unknown {
    let value = this.parsePrimary();
    // dot-path field access, PLUS method-call syntax (B.8's chainable
    // getEntriesByColor('x') etc.) — a dotted name immediately followed by
    // "(" calls that method on the current value rather than reading a
    // field named after it. Function-call syntax for named BUILTINS (not
    // methods on a value) is already resolved at parsePrimary, for bare
    // (non-dotted) calls like slug(x).
    while (this.peek().kind === "punct" && this.peek().value === ".") {
      this.next();
      const field = this.next();
      if (field.kind !== "ident") throw new ExprSyntaxError(`Expected a field name after '.' at position ${field.pos}`, field.pos);
      if (this.peek().kind === "punct" && this.peek().value === "(") {
        this.next();
        const args: unknown[] = [];
        if (!(this.peek().kind === "punct" && this.peek().value === ")")) {
          args.push(this.parseTernary());
          while (this.peek().kind === "punct" && this.peek().value === ",") { this.next(); args.push(this.parseTernary()); }
        }
        this.expectPunct(")");
        value = callMethod(value, field.value, args, field.pos);
      } else {
        value = getField(value, field.value);
      }
    }
    return value;
  }

  private parsePrimary(): unknown {
    const t = this.next();
    if (t.kind === "number") return parseFloat(t.value);
    if (t.kind === "string") return t.value;
    if (t.kind === "punct" && t.value === "(") {
      const inner = this.parseTernary();
      this.expectPunct(")");
      return inner;
    }
    if (t.kind === "ident") {
      if (t.value === "true") return true;
      if (t.value === "false") return false;
      if (t.value === "null") return null;
      // function call: ident "(" args... ")"
      if (this.peek().kind === "punct" && this.peek().value === "(") {
        this.next();
        const args: unknown[] = [];
        if (!(this.peek().kind === "punct" && this.peek().value === ")")) {
          args.push(this.parseTernary());
          while (this.peek().kind === "punct" && this.peek().value === ",") { this.next(); args.push(this.parseTernary()); }
        }
        this.expectPunct(")");
        return callBuiltin(t.value, args);
      }
      return resolveIdent(t.value, this.ctx);
    }
    throw new ExprSyntaxError(`Unexpected token '${t.value || "<eof>"}' at position ${t.pos}`, t.pos);
  }
}

// Calls a real method on an already-resolved value (B.8's chaining —
// getEntriesByColor('primary').getEntriesByRole('text')). Deliberately
// narrow: only a genuine function-valued property is callable this way; a
// null/undefined target (B.1a's propagation) or a non-function field of
// that name throws a clear ExprSyntaxError rather than a raw TypeError, so
// the error still looks like every other expression-evaluation failure a
// document author might see.
function callMethod(target: unknown, methodName: string, args: unknown[], pos: number): unknown {
  if (target === null || target === undefined) return null;
  const fn = (target as Record<string, unknown>)[methodName];
  if (typeof fn !== "function") {
    throw new ExprSyntaxError(`'${methodName}' is not a method on this value (at position ${pos}).`, pos);
  }
  return (fn as (...a: unknown[]) => unknown).apply(target, args);
}

function resolveIdent(name: string, ctx: ExprContext): unknown {
  if (ctx.vars && Object.prototype.hasOwnProperty.call(ctx.vars, name)) return ctx.vars[name];
  if (name === "record") return ctx.record;
  // Bare identifiers (not "record.x") resolve against the record directly,
  // for ergonomic `where` expressions like `theme == 'light'` instead of
  // requiring `record.theme == 'light'` everywhere.
  return getField(ctx.record, name);
}

// B.1a: field access on null/undefined propagates null rather than
// throwing — a chained `a.b.c` where `a.b` is null resolves the whole
// expression to null (then to `false` wherever a boolean is needed).
function getField(obj: unknown, field: string): unknown {
  if (obj === null || obj === undefined || typeof obj !== "object") return null;
  const rec = obj as { data?: Record<string, unknown> } & Record<string, unknown>;
  // AnyRecord's real fields live under `.data` (the tagged-record wrapper) —
  // transparently reach through it so `record.theme` (not `record.data.theme`)
  // works in user-facing expressions.
  if ("data" in rec && rec.data && typeof rec.data === "object" && field in (rec.data as object)) {
    return (rec.data as Record<string, unknown>)[field];
  }
  if (field in rec) return rec[field];
  return null;
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}

function compare(op: string, left: unknown, right: unknown): boolean {
  if (left === null || left === undefined || right === null || right === undefined) {
    // B.1a: comparisons against null are always false (never throw) — the
    // one exception is == / != against null itself, which behave sensibly.
    if (op === "==") return left === right;
    if (op === "!=") return left !== right;
    return false;
  }
  switch (op) {
    case "==": return left === right;
    case "!=": return left !== right;
    case "<": return (left as number) < (right as number);
    case "<=": return (left as number) <= (right as number);
    case ">": return (left as number) > (right as number);
    case ">=": return (left as number) >= (right as number);
  }
  return false;
}

export function isTruthy(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0 && !Number.isNaN(value);
  if (typeof value === "string") return value.length > 0;
  return true;
}

// ── Built-in functions ─────────────────────────────────────────────────────
type BuiltinFn = (args: unknown[]) => unknown;
const BUILTINS: Record<string, BuiltinFn> = {
  upper: (args) => String(args[0] ?? "").toUpperCase(),
  lower: (args) => String(args[0] ?? "").toLowerCase(),
  slug: (args) => String(args[0] ?? "").toLowerCase().replace(/[\s_/]+/g, "-").replace(/[^a-z0-9-]/g, ""),
};

export function registerBuiltin(name: string, fn: BuiltinFn): void {
  BUILTINS[name] = fn;
}

function callBuiltin(name: string, args: unknown[]): unknown {
  const fn = BUILTINS[name];
  if (!fn) throw new ExprSyntaxError(`Unknown function '${name}'`, -1);
  return fn(args);
}

export function evaluate(src: string, ctx: ExprContext): unknown {
  const tokens = tokenize(src);
  const parser = new Parser(tokens, ctx);
  return parser.parseExpression();
}

export function evaluateString(src: string, ctx: ExprContext): string {
  const result = evaluate(src, ctx);
  return result === null || result === undefined ? "" : String(result);
}

// A real gap found closing the document schema against the plan: B.5
// ("per-entry formatting... must be fully user-authorable, not fixed to a
// small set of presets") and B.11 (conditional composition via ordinary
// expressions embedded in template text) both require a TEMPLATE STRING —
// literal text with `${expr}` spans interpolated — not a single bare
// expression the way `where`/sort's `by` are. evaluate()/evaluateString()
// only ever handled the latter. This is the former: finds each `${...}`
// span, evaluates its contents against ctx, and substitutes the stringified
// result back into the surrounding literal text.
const INTERPOLATION_RE = /\$\{([^}]*)\}/g;

export function interpolateTemplate(template: string, ctx: ExprContext): string {
  return template.replace(INTERPOLATION_RE, (_match, exprSrc: string) => evaluateString(exprSrc, ctx));
}

// Scans a template string for `${...}` spans and validates each span's
// CONTENTS as an expression (never the literal text around them) — the
// interpolation-aware check syntax.ts's own comment anticipated but never
// built. Position reported is within the template string (offset by the
// span's own start), not global to the document, since callers already
// track which document field this template came from.
export function checkTemplateExpressionSyntax(template: string): ExprSyntaxError[] {
  const errors: ExprSyntaxError[] = [];
  let m: RegExpExecArray | null;
  INTERPOLATION_RE.lastIndex = 0;
  while ((m = INTERPOLATION_RE.exec(template)) !== null) {
    try {
      evaluate(m[1], {});
    } catch (err) {
      if (err instanceof ExprSyntaxError) {
        errors.push(new ExprSyntaxError(err.message, m.index));
      }
    }
  }
  return errors;
}
