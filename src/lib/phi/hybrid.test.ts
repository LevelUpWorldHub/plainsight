import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { detectHeuristic } from "./detect";
import {
  assertCloudPayloadIsRedacted,
  buildHybridPrompt,
  promptContainsRawDocument,
} from "./hybrid";
import { redact } from "./redact";

const original = readFileSync(
  new URL("../../../samples/medical-bill.txt", import.meta.url),
  "utf8",
);

describe("hybrid prompt safety", () => {
  const findings = detectHeuristic(original);
  const redacted = redact(original, findings);

  it("sends the original only when Gemini Nano is ready", () => {
    const request = buildHybridPrompt({
      onDeviceReady: true,
      firebaseConfigured: true,
      original,
      redacted,
    });
    expect(request).toMatchObject({
      mode: "prefer_on_device",
      path: "on_device",
      documentText: original,
    });
  });

  it("sends already-redacted text on the cloud path", () => {
    const request = buildHybridPrompt({
      onDeviceReady: false,
      firebaseConfigured: true,
      original,
      redacted,
    });
    expect(request?.path).toBe("cloud");
    expect(request?.mode).toBe("prefer_on_device");
    expect(request?.documentText).toBe(redacted);
    expect(request?.prompt).not.toContain("453-22-1890");
    expect(request?.prompt).not.toContain("Mara Ellison");
    expect(request?.prompt).not.toContain("XTR-4491208");
    expect(request?.prompt).toContain("[SSN]");
    expect(promptContainsRawDocument(request!.prompt, original, redacted)).toBe(false);
    expect(() => assertCloudPayloadIsRedacted(request!, original, redacted)).not.toThrow();
  });

  it("does not build a model request when Firebase is not configured", () => {
    expect(
      buildHybridPrompt({
        onDeviceReady: true,
        firebaseConfigured: false,
        original,
        redacted,
      }),
    ).toBeNull();
  });

  it("refuses a cloud request that still carries the raw document", () => {
    const unsafe = {
      mode: "prefer_on_device" as const,
      path: "cloud" as const,
      documentText: original,
      prompt: original,
    };
    expect(() => assertCloudPayloadIsRedacted(unsafe, original, redacted)).toThrow(
      /redacted text/,
    );
  });
});
