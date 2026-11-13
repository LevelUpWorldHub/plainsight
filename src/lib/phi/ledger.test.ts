import { describe, expect, it } from "vitest";
import { detectHeuristic } from "./detect";
import { createLedgerEntry, ledgerContainsOriginal, ledgerToJson } from "./ledger";
import { redact } from "./redact";

describe("ledger entries", () => {
  it("stores a redacted preview and not the original document", () => {
    const original = "Patient: Mara Ellison\nSSN: 453-22-1890";
    const findings = detectHeuristic(original);
    const redacted = redact(original, findings);
    const entry = createLedgerEntry({
      destination: "ChatGPT",
      findings,
      redacted,
      path: "heuristic_only",
      kind: "text",
      now: new Date("2026-11-13T00:00:00.000Z"),
      id: "entry-1",
    });
    expect(entry.redactedPreview).not.toContain("Mara Ellison");
    expect(entry.redactedPreview).not.toContain("453-22-1890");
    expect(entry.redactedPreview).toContain("[SSN]");
    expect(ledgerContainsOriginal(entry, original)).toBe(false);
    expect(ledgerToJson([entry])).not.toContain("453-22-1890");
    expect(entry.totalRedactions).toBe(findings.length);
    expect(entry.timestamp).toBe("2026-11-13T00:00:00.000Z");
  });
});
