import type { EntityType, Finding } from "./types";

const PRIORITY: Record<EntityType, number> = {
  ssn: 100,
  email: 90,
  phone: 85,
  mrn: 80,
  insurance_id: 75,
  dob: 70,
  address: 65,
  medication: 55,
  diagnosis: 50,
  name: 40,
};

export function resolveOverlaps(findings: Finding[]): Finding[] {
  const ranked = findings
    .filter((finding) => finding.end > finding.start && finding.start >= 0)
    .sort((a, b) => {
      const priority = PRIORITY[b.type] - PRIORITY[a.type];
      if (priority !== 0) return priority;
      const length = b.end - b.start - (a.end - a.start);
      if (length !== 0) return length;
      if (a.source === "rule" && b.source !== "rule") return -1;
      if (b.source === "rule" && a.source !== "rule") return 1;
      return a.start - b.start;
    });

  const kept: Finding[] = [];
  for (const finding of ranked) {
    const overlaps = kept.some(
      (existing) => finding.start < existing.end && finding.end > existing.start,
    );
    if (!overlaps) kept.push(finding);
  }
  return kept.sort((a, b) => a.start - b.start);
}
