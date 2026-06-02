export function csvToNumbers(csv: string): number[] {
  return (csv || "")
    .split(",")
    .map((v) => Math.max(0, Math.min(100, parseInt(v.trim(), 10))))
    .filter((v) => !isNaN(v));
}
