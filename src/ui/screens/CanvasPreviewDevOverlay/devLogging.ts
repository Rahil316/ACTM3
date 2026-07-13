// ── Console logging ───────────────────────────────────────────────────────────

export function logSection(title: string, data: unknown) {
  console.group(`%c[CanvasPreviewDev] ${title}`, "color:#a78bfa;font-weight:bold");
  console.log(data);
  console.groupEnd();
}

export function logValidation(label: string, pass: boolean, detail?: string) {
  const icon = pass ? "✅" : "❌";
  const style = pass ? "color:#34d399" : "color:#f87171";
  console.log(`%c${icon} ${label}${detail ? ` — ${detail}` : ""}`, style);
}
