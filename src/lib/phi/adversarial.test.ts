import { describe, expect, it } from "vitest";
import { detectHeuristic } from "./detect";
import {
  assertCloudPayloadIsRedacted,
  buildHybridPrompt,
  detectionPrompt,
  promptContainsRawDocument,
} from "./hybrid";
import { createLedgerEntry, ledgerContainsOriginal } from "./ledger";
import type { ModelRunner } from "./model";
import { parseModelFindings } from "./parse-model";
import { redact } from "./redact";
import { applyRules, parseRule } from "./rules";
import { runScan } from "./run-scan";
import type { Finding } from "./types";

function runner(ready: boolean): ModelRunner & { prompts: string[] } {
  const prompts: string[] = [];
  return {
    prompts,
    isOnDeviceReady: async () => ready,
    generate: async (request) => {
      prompts.push(request.prompt);
      return { text: "{}", inferenceSource: ready ? "on_device" : "in_cloud" };
    },
  };
}

describe("adversarial", () => {
  it("refuses the cloud when redaction changed nothing", async () => {
    const model = runner(false);
    const result = await runScan("The clinic opens at 9.", [], {
      firebaseConfigured: true,
      allowCloud: true,
      model,
    });
    expect(model.prompts).toHaveLength(0);
    expect(result.cloudOffer).toBeNull();
    expect(result.detail).toMatch(/nothing was redacted/i);
    expect(result.trace.charactersSent).toBe(0);
    expect(result.trace.payload).toBe("none");
  });

  it("refuses a cloud prompt that smuggles the original after the end marker", () => {
    const original = "Patient: Mara Ellison\nSSN: 453-22-1890";
    const findings = detectHeuristic(original);
    const redacted = redact(original, findings);
    const request = buildHybridPrompt({
      onDeviceReady: false,
      firebaseConfigured: true,
      original,
      redacted,
    });
    const smuggled = { ...request!, prompt: `${request!.prompt}\n${original}` };
    expect(promptContainsRawDocument(smuggled.prompt, original, redacted)).toBe(true);
    expect(() => assertCloudPayloadIsRedacted(smuggled, original, redacted)).toThrow(
      /raw document/,
    );
  });

  it("refuses a cloud payload that still contains an SSN", () => {
    const redacted = "Balance due. SSN: 453-22-1890";
    const original = `${redacted}\nExtra line so this is not identical.`;
    const request = {
      mode: "prefer_on_device" as const,
      path: "cloud" as const,
      documentText: redacted,
      prompt: detectionPrompt(redacted),
    };
    expect(() => assertCloudPayloadIsRedacted(request, original, redacted)).toThrow(/SSN/);
  });

  it("does not leave the tail of an overlapping span in the outbox", () => {
    const text = "HELLO WORLD";
    const findings: Finding[] = [
      {
        type: "name",
        start: 0,
        end: 5,
        text: "HELLO",
        replacement: "[NAME]",
        source: "heuristic",
        confidence: 1,
      },
      {
        type: "name",
        start: 3,
        end: 11,
        text: "LO WORLD",
        replacement: "[NAME]",
        source: "heuristic",
        confidence: 1,
      },
    ];
    const output = redact(text, findings);
    expect(output).not.toContain("WORLD");
    expect(output).not.toContain("HELLO");
    expect(output).toBe("[NAME]");
  });

  it("folds fullwidth and Arabic-Indic digits and Cyrillic lookalikes", async () => {
    const fullwidth = "SSN: \uFF14\uFF15\uFF13-\uFF12\uFF12-\uFF11\uFF18\uFF19\uFF10";
    const arabic = "SSN: \u0664\u0665\u0663-\u0662\u0662-\u0661\u0668\u0669\u0660";
    const lookalike = "Patient: M\u0430ra Ellison";
    for (const sample of [fullwidth, arabic]) {
      const result = await runScan(sample, [], { firebaseConfigured: false, allowCloud: false });
      expect(result.redacted).toContain("[SSN]");
      expect(result.redacted).not.toMatch(/1890/);
    }
    const name = await runScan(lookalike, [], { firebaseConfigured: false, allowCloud: false });
    expect(name.redacted).toContain("[NAME]");
    expect(name.redacted).not.toContain("Mara");
    expect(name.original).toContain("Mara Ellison");
  });

  it("ignores a two-letter model needle that would paint the whole note", () => {
    const findings = parseModelFindings(
      JSON.stringify({ findings: [{ type: "name", text: "on" }] }),
      "Patient is on metformin today.",
    );
    expect(findings).toEqual([]);
  });

  it("treats a rule with regex metacharacters as literal text", () => {
    const rule = parseRule("never send a+");
    const text = "aaab and a+";
    const redacted = redact(text, applyRules([], text, [rule]));
    expect(redacted).toBe("aaab and [NAME]");
  });

  it("stores markup as text and never stores the original in the ledger", () => {
    const original = "SSN: 453-22-1890";
    const findings = detectHeuristic(original);
    const entry = createLedgerEntry({
      destination: "<img src=x onerror=alert(1)>",
      findings,
      redacted: redact(original, findings),
      path: "heuristic_only",
      kind: "text",
      id: "adv-1",
      now: new Date("2026-11-13T00:00:00.000Z"),
    });
    expect(entry.destination).toContain("onerror");
    expect(entry.redactedPreview).not.toContain("453-22-1890");
    expect(ledgerContainsOriginal(entry, "453-22-1890")).toBe(false);
  });

  it("finishes a long non-identifier note without hanging", () => {
    const text = `${"A ".repeat(20000)}Street is not a numbered address.`;
    const started = Date.now();
    const findings = detectHeuristic(text);
    expect(Date.now() - started).toBeLessThan(1500);
    expect(findings.every((finding) => finding.type !== "ssn")).toBe(true);
  });
});
