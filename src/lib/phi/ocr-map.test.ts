import { describe, expect, it } from "vitest";
import { detectHeuristic } from "./detect";
import { joinOcrWords, wordsOverlappingFindings, type OcrWord } from "./ocr-map";

describe("OCR word mapping", () => {
  it("marks only the words that overlap a finding", () => {
    const words: OcrWord[] = [
      { text: "Patient:", bbox: { x0: 0, y0: 0, x1: 40, y1: 10 } },
      { text: "Mara", bbox: { x0: 48, y0: 0, x1: 80, y1: 10 } },
      { text: "Ellison", bbox: { x0: 88, y0: 0, x1: 140, y1: 10 } },
      { text: "Balance", bbox: { x0: 0, y0: 20, x1: 50, y1: 30 } },
    ];
    const joined = joinOcrWords(words);
    const findings = detectHeuristic(joined.text);
    const hit = wordsOverlappingFindings(joined.spans, findings).map((word) => word.text);
    expect(joined.text).toContain("Mara Ellison");
    expect(hit).toEqual(["Mara", "Ellison"]);
  });
});
