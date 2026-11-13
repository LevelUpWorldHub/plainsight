import type { EntityType, Finding } from "./types";

export function redact(text: string, findings: Finding[]): string {
  const sorted = [...findings].sort((a, b) => a.start - b.start);
  let output = "";
  let cursor = 0;
  for (const finding of sorted) {
    if (finding.start < cursor) continue;
    if (finding.start > text.length) break;
    output += text.slice(cursor, finding.start);
    output += finding.replacement;
    cursor = Math.min(finding.end, text.length);
  }
  output += text.slice(cursor);
  return output;
}

export function charactersHeld(findings: Finding[]): number {
  return findings.reduce((sum, finding) => sum + Math.max(0, finding.end - finding.start), 0);
}

export function countByType(
  findings: Finding[],
): Partial<Record<EntityType, number>> {
  const counts: Partial<Record<EntityType, number>> = {};
  for (const finding of findings) {
    counts[finding.type] = (counts[finding.type] ?? 0) + 1;
  }
  return counts;
}
