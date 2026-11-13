import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { heldPercent, measureDocument, sumImpact } from "./impact";

describe("impact figures", () => {
  it("measures the fictional clinic bill from the detector, not from a hardcoded total", () => {
    const text = readFileSync(new URL("../../../samples/medical-bill.txt", import.meta.url), "utf8");
    const impact = measureDocument(text);
    expect(impact.byType.ssn).toBe(1);
    expect(impact.byType.name).toBeGreaterThanOrEqual(1);
    expect(impact.redactions).toBeGreaterThanOrEqual(10);
    expect(impact.charactersHeld).toBeGreaterThan(80);
    expect(impact.charactersHeld).toBeLessThan(text.length);
    expect(heldPercent(impact)).toBeGreaterThan(0);
    expect(JSON.stringify(impact)).not.toContain("453-22-1890");
  });

  it("sums a set of documents", () => {
    const total = sumImpact([
      measureDocument("Patient: Ada Lovelace\nSSN: 111-22-3333"),
      measureDocument("No identifiers in this line."),
    ]);
    expect(total.byType.ssn).toBe(1);
    expect(total.byType.name).toBe(1);
    expect(total.redactions).toBe(2);
    expect(total.characters).toBeGreaterThan(total.charactersHeld);
  });
});