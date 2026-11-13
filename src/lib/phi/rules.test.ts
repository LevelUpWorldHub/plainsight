import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { detectHeuristic } from "./detect";
import { redact } from "./redact";
import { applyRules, parseRule } from "./rules";

const bill = readFileSync(
  new URL("../../../samples/medical-bill.txt", import.meta.url),
  "utf8",
);
const note = readFileSync(
  new URL("../../../samples/caregiver-note.txt", import.meta.url),
  "utf8",
);

describe("plain-English rules", () => {
  it("reads a child name as a literal redaction", () => {
    const rule = parseRule("never send my kid's name Maya Chen");
    expect(rule.directives).toEqual([
      { kind: "redact_literal", literal: "Maya Chen", entityType: "name" },
    ]);
    expect(rule.interpretation).toContain("Maya Chen");
    const redacted = redact(note, applyRules(detectHeuristic(note), note, [rule]));
    expect(redacted).not.toContain("Maya Chen");
    expect(redacted).toContain("[NAME]");
  });

  it("redacts every name when the rule does not name a person", () => {
    const rule = parseRule("never send my kid's name");
    expect(rule.directives).toEqual([{ kind: "redact_type", entityType: "name" }]);
  });

  it("keeps insurance IDs and hides everything else", () => {
    const rule = parseRule("keep insurance IDs, hide everything else");
    expect(rule.directives).toEqual([
      { kind: "keep_type", entityType: "insurance_id" },
      { kind: "redact_all_others" },
    ]);
    const redacted = redact(bill, applyRules(detectHeuristic(bill), bill, [rule]));
    expect(redacted).toContain("XTR-4491208");
    expect(redacted).toContain("88G-2291");
    expect(redacted).not.toContain("453-22-1890");
    expect(redacted).not.toContain("Mara Ellison");
    expect(redacted).not.toContain("mara.ellison@example.com");
  });

  it("hides SSNs and can keep phone numbers", () => {
    expect(parseRule("always hide SSNs").directives).toEqual([
      { kind: "redact_type", entityType: "ssn" },
    ]);
    const keepPhone = parseRule("keep phone numbers");
    expect(keepPhone.directives).toEqual([
      { kind: "keep_type", entityType: "phone" },
    ]);
    const redacted = redact(
      bill,
      applyRules(detectHeuristic(bill), bill, [keepPhone]),
    );
    expect(redacted).toContain("(415) 555-0148");
    expect(redacted).not.toContain("453-22-1890");
  });

  it("maps a possessive address clause to the address type", () => {
    const rule = parseRule("never send my kid's name Maya Chen and her address");
    expect(rule.directives).toEqual([
      { kind: "redact_literal", literal: "Maya Chen", entityType: "name" },
      { kind: "redact_type", entityType: "address" },
    ]);
  });

  it("keeps every type joined with and", () => {
    const rule = parseRule("keep phone numbers and email addresses");
    expect(rule.directives).toEqual([
      { kind: "keep_type", entityType: "phone" },
      { kind: "keep_type", entityType: "email" },
    ]);
  });
});
