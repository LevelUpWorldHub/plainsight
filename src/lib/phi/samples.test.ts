import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SAMPLE_DOCUMENTS } from "./samples";

describe("fictional samples", () => {
  it("ships every catalog file with an obvious fictional banner", () => {
    const files = readdirSync(new URL("../../../samples", import.meta.url))
      .filter((name) => name.endsWith(".txt"))
      .sort();
    expect(files).toEqual(SAMPLE_DOCUMENTS.map((sample) => sample.file).sort());
    for (const file of files) {
      const text = readFileSync(new URL(`../../../samples/${file}`, import.meta.url), "utf8");
      expect(text.startsWith("FICTIONAL SAMPLE")).toBe(true);
      expect(text).toContain("not a real patient");
    }
  });
});
