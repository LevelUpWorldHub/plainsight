import type { ModelRunner } from "./model";
import { describeDirectives, parseRule } from "./rules";
import {
  isEntityType,
  type Directive,
  type PrivacyRule,
} from "./types";

function extractJson(raw: string): string | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced?.[1] ?? raw;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  return body.slice(start, end + 1);
}

function rulePrompt(plainText: string): string {
  return [
    "Convert this privacy rule into JSON.",
    "Return only:",
    '{"directives":[{"kind":"redact_literal|redact_type|keep_type|redact_all_others","entityType":"name|dob|mrn|insurance_id|address|phone|ssn|email|diagnosis|medication","literal":"optional exact text"}]}',
    "Literals must be copied from the rule. Do not invent names.",
    "RULE:",
    plainText,
  ].join("\n");
}

function directivesFromModel(raw: string, plainText: string): Directive[] {
  const json = extractJson(raw);
  if (!json) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  const directives = (parsed as { directives?: unknown }).directives;
  if (!Array.isArray(directives)) return [];
  const accepted: Directive[] = [];
  for (const item of directives) {
    if (!item || typeof item !== "object") continue;
    const kind = (item as { kind?: unknown }).kind;
    const entityType = (item as { entityType?: unknown }).entityType;
    const literal = (item as { literal?: unknown }).literal;
    if (
      kind !== "redact_literal" &&
      kind !== "redact_type" &&
      kind !== "keep_type" &&
      kind !== "redact_all_others"
    ) {
      continue;
    }
    if (kind === "redact_all_others") {
      accepted.push({ kind });
      continue;
    }
    if (typeof entityType !== "string" || !isEntityType(entityType)) continue;
    if (kind === "redact_literal") {
      if (typeof literal !== "string" || literal.trim().length < 2) continue;
      if (!plainText.toLowerCase().includes(literal.trim().toLowerCase())) continue;
      accepted.push({ kind, literal: literal.trim(), entityType });
      continue;
    }
    accepted.push({ kind, entityType });
  }
  return accepted;
}

export async function interpretRule(
  plainText: string,
  model?: ModelRunner,
): Promise<PrivacyRule> {
  const base = parseRule(plainText);
  if (!model) return base;
  let ready = false;
  try {
    ready = await model.isOnDeviceReady();
  } catch {
    ready = false;
  }
  if (!ready) return base;

  try {
    const response = await model.generate({
      mode: "prefer_on_device",
      path: "on_device",
      documentText: plainText,
      prompt: rulePrompt(plainText),
    });
    if (response.inferenceSource === "in_cloud") return base;
    const directives = directivesFromModel(response.text, plainText);
    if (directives.length === 0) return base;
    return {
      ...base,
      source: "on_device_model",
      directives,
      interpretation: describeDirectives(directives),
    };
  } catch {
    return base;
  }
}
