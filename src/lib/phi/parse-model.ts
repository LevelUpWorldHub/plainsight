import { resolveOverlaps } from "./overlap";
import {
  isEntityType,
  REDACTION_TOKENS,
  type Finding,
} from "./types";

function extractJson(raw: string): string | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced?.[1] ?? raw;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  return body.slice(start, end + 1);
}

export function parseModelFindings(raw: string, haystack: string): Finding[] {
  const json = extractJson(raw);
  if (!json) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  const findings = (parsed as { findings?: unknown }).findings;
  if (!Array.isArray(findings)) return [];

  const collected: Finding[] = [];
  for (const item of findings) {
    if (!item || typeof item !== "object") continue;
    const type = (item as { type?: unknown }).type;
    const text = (item as { text?: unknown }).text;
    if (typeof type !== "string" || !isEntityType(type)) continue;
    if (typeof text !== "string") continue;
    const needle = text.trim();
    if (needle.length < 2) continue;
    if (/^\[[A-Z][A-Z ]+\]$/.test(needle)) continue;
    if (!haystack.includes(needle)) continue;
    let from = 0;
    while (from <= haystack.length) {
      const start = haystack.indexOf(needle, from);
      if (start < 0) break;
      collected.push({
        type,
        start,
        end: start + needle.length,
        text: haystack.slice(start, start + needle.length),
        replacement: REDACTION_TOKENS[type],
        source: "model",
        confidence: 0.74,
      });
      from = start + needle.length;
    }
  }
  return resolveOverlaps(collected);
}

export function placeFindingsInOriginal(
  original: string,
  findings: Finding[],
  mustAlsoAppearIn?: string,
): Finding[] {
  const placed: Finding[] = [];
  for (const finding of findings) {
    if (mustAlsoAppearIn !== undefined && !mustAlsoAppearIn.includes(finding.text)) {
      continue;
    }
    let from = 0;
    while (from <= original.length) {
      const start = original.indexOf(finding.text, from);
      if (start < 0) break;
      placed.push({
        ...finding,
        start,
        end: start + finding.text.length,
        text: original.slice(start, start + finding.text.length),
        source: "model",
      });
      from = start + finding.text.length;
    }
  }
  return placed;
}
