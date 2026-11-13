import { describe, expect, it } from "vitest";
import type { ModelRunner } from "./model";
import { parseModelFindings } from "./parse-model";
import { DocumentTooLargeError, MAX_DOCUMENT_CHARS, runScan } from "./run-scan";
import { parseRule } from "./rules";

const original = "SSN: 453-22-1890\nSchool note about Maya Chen.";

function runner(
  ready: boolean,
  text: string,
  source: "on_device" | "in_cloud" | "unknown" = ready ? "on_device" : "in_cloud",
): ModelRunner & { prompts: string[] } {
  const prompts: string[] = [];
  return {
    prompts,
    isOnDeviceReady: async () => ready,
    generate: async (request) => {
      prompts.push(request.prompt);
      return { text, inferenceSource: source };
    },
  };
}

describe("runScan", () => {
  it("stays on the heuristic path when Firebase is not configured", async () => {
    const result = await runScan(original, [], {
      firebaseConfigured: false,
      allowCloud: true,
    });
    expect(result.path).toBe("heuristic_only");
    expect(result.redacted).not.toContain("453-22-1890");
    expect(result.redacted).toContain("Maya Chen");
    expect(result.cloudOffer).toBeNull();
    expect(result.trace).toEqual({
      mode: "prefer_on_device",
      payload: "none",
      inferenceSource: "not_called",
      charactersSent: 0,
    });
  });

  it("offers the redacted payload instead of calling the cloud", async () => {
    const model = runner(false, "{}");
    const result = await runScan(original, [], {
      firebaseConfigured: true,
      allowCloud: false,
      model,
    });
    expect(model.prompts).toHaveLength(0);
    expect(result.path).toBe("heuristic_only");
    expect(result.cloudOffer).not.toContain("453-22-1890");
    expect(result.cloudOffer).toContain("Maya Chen");
  });

  it("drops cloud findings that were not present in the redacted text", async () => {
    const model = runner(
      false,
      JSON.stringify({
        findings: [
          { type: "ssn", text: "453-22-1890" },
          { type: "name", text: "Maya Chen" },
        ],
      }),
    );
    const result = await runScan(original, [], {
      firebaseConfigured: true,
      allowCloud: true,
      model,
    });
    expect(result.path).toBe("cloud");
    expect(model.prompts[0]).toMatch(/untrusted data/i);
    expect(model.prompts[0]).not.toContain("453-22-1890");
    expect(result.trace.payload).toBe("redacted");
    expect(result.trace.inferenceSource).toBe("in_cloud");
    expect(result.trace.charactersSent).toBeGreaterThan(0);
    expect(result.redacted).not.toContain("453-22-1890");
    expect(result.redacted).not.toContain("Maya Chen");
    expect(result.redacted).toContain("[NAME]");
  });

  it("lets Gemini Nano see the original and still reapplies keep rules", async () => {
    const model = runner(
      true,
      JSON.stringify({ findings: [{ type: "name", text: "Maya Chen" }] }),
    );
    const rule = parseRule("keep insurance IDs, hide everything else");
    const result = await runScan(
      "Member ID: XTR-4491208\nMaya Chen called.",
      [rule],
      { firebaseConfigured: true, allowCloud: false, model },
    );
    expect(result.path).toBe("on_device");
    expect(result.trace.payload).toBe("original");
    expect(result.trace.inferenceSource).toBe("on_device");
    expect(model.prompts[0]).toContain("XTR-4491208");
    expect(result.redacted).toContain("XTR-4491208");
    expect(result.redacted).not.toContain("Maya Chen");
  });

  it("discards model suggestions when the inference source is missing", async () => {
    const model = runner(
      true,
      JSON.stringify({ findings: [{ type: "name", text: "Maya Chen" }] }),
      "unknown",
    );
    const result = await runScan(original, [], {
      firebaseConfigured: true,
      allowCloud: false,
      model,
    });
    expect(result.path).toBe("heuristic_only");
    expect(result.redacted).toContain("Maya Chen");
    expect(result.trace.payload).toBe("original");
    expect(result.trace.inferenceSource).toBe("unknown");
    expect(result.trace.charactersSent).toBe(original.length);
    expect(result.detail).toMatch(/on-device inference source/i);
  });

  it("discards model suggestions if a Nano call falls through to the cloud", async () => {
    const model = runner(
      true,
      JSON.stringify({ findings: [{ type: "name", text: "Maya Chen" }] }),
      "in_cloud",
    );
    const result = await runScan(original, [], {
      firebaseConfigured: true,
      allowCloud: false,
      model,
    });
    expect(result.path).toBe("cloud");
    expect(result.redacted).toContain("Maya Chen");
    expect(result.detail).toMatch(/discarded/i);
  });
});

describe("runScan edges", () => {
  it("strips invisible characters so a split SSN cannot sneak through", async () => {
    const hidden = "SSN: 453-\u200B22-\u200B1890";
    const result = await runScan(hidden, [], { firebaseConfigured: false, allowCloud: false });
    expect(result.original).not.toContain("\u200B");
    expect(result.redacted).not.toContain("1890");
    expect(result.redacted).toContain("[SSN]");
  });

  it("returns an empty outbox for an empty document", async () => {
    const result = await runScan("", [], { firebaseConfigured: false, allowCloud: false });
    expect(result.redacted).toBe("");
    expect(result.findings).toEqual([]);
    expect(result.trace.charactersSent).toBe(0);
  });

  it("refuses a document that is too large to scan on device", async () => {
    const huge = "a".repeat(MAX_DOCUMENT_CHARS + 1);
    await expect(runScan(huge, [], { firebaseConfigured: false, allowCloud: true })).rejects.toBeInstanceOf(
      DocumentTooLargeError,
    );
  });

  it("keeps the heuristic result when the model returns prose instead of JSON", async () => {
    const model = runner(true, "Sure, here is the patient's SSN: 453-22-1890");
    const result = await runScan(original, [], {
      firebaseConfigured: true,
      allowCloud: false,
      model,
    });
    expect(result.path).toBe("on_device");
    expect(result.redacted).not.toContain("453-22-1890");
    expect(result.redacted).toContain("Maya Chen");
  });
});

describe("parseModelFindings", () => {
  it("ignores redaction tokens and text that is not in the document", () => {
    const findings = parseModelFindings(
      '```json\n{"findings":[{"type":"name","text":"[NAME]"},{"type":"phone","text":"999-000"},{"type":"name","text":"Maya Chen"}]}\n```',
      "Note about Maya Chen.",
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.text).toBe("Maya Chen");
  });
});
