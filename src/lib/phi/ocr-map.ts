import type { Finding } from "./types";

export interface OcrWord {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface OcrSpan {
  word: OcrWord;
  start: number;
  end: number;
}

export function joinOcrWords(words: OcrWord[]): { text: string; spans: OcrSpan[] } {
  let text = "";
  const spans: OcrSpan[] = [];
  for (const word of words) {
    const token = word.text.trim();
    if (!token) continue;
    if (text.length > 0) text += " ";
    const start = text.length;
    text += token;
    spans.push({ word, start, end: text.length });
  }
  return { text, spans };
}

export function wordsOverlappingFindings(
  spans: OcrSpan[],
  findings: Finding[],
): OcrWord[] {
  return spans
    .filter((span) =>
      findings.some(
        (finding) => span.start < finding.end && span.end > finding.start,
      ),
    )
    .map((span) => span.word);
}
