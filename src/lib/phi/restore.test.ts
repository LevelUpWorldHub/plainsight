import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { detectHeuristic } from "./detect";
import { redact } from "./redact";
import { FRONT_DESK_REPLY, restoreReply } from "./restore";

describe("restoreReply", () => {
  it("puts originals back in encounter order and leaves unknown tokens", () => {
    const original = "Patient: Mara Ellison\nPhysician: Dr. Helen Cho\nSSN: 453-22-1890";
    const findings = detectHeuristic(original);
    const redacted = redact(original, findings);
    const reply = `Tell ${redacted.includes("[NAME]") ? "[NAME]" : "missing"} and [NAME] that the [SSN] is on file. Also [SSN].`;
    const restored = restoreReply(reply, findings);
    expect(restored.text.startsWith("Tell Mara Ellison and Dr. Helen Cho")).toBe(true);
    expect(restored.text).toContain("453-22-1890");
    expect(restored.text.endsWith("[SSN].")).toBe(true);
    expect(restored.restored).toBe(3);
    expect(restored.unmatched).toBe(1);
  });

  it("restores the front-desk reply against the clinic bill", () => {
    const bill = readFileSync(new URL("../../../samples/medical-bill.txt", import.meta.url), "utf8");
    const restored = restoreReply(FRONT_DESK_REPLY, detectHeuristic(bill));
    expect(restored.text).toContain("Mara Ellison");
    expect(restored.text).toContain("453-22-1890");
    expect(restored.text).not.toContain("[NAME]");
    expect(restored.text).not.toContain("[SSN]");
    expect(restored.unmatched).toBe(0);
  });

  it("does not invent a value for a token the scan did not find", () => {
    const restored = restoreReply("Call [PHONE] tomorrow.", []);
    expect(restored.text).toBe("Call [PHONE] tomorrow.");
    expect(restored.restored).toBe(0);
    expect(restored.unmatched).toBe(1);
  });
});