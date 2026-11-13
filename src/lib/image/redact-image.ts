"use client";

import type { OcrWord } from "@/lib/phi/ocr-map";

interface OcrWorker {
  recognize: (
    image: Blob,
    options?: object,
    output?: { text?: boolean; blocks?: boolean },
  ) => Promise<{
    data: {
      blocks: Array<{
        paragraphs: Array<{
          lines: Array<{
            words: Array<{ text: string; bbox: OcrWord["bbox"] }>;
          }>;
        }>;
      }> | null;
    };
  }>;
  terminate: () => Promise<unknown>;
}

type CreateWorker = (
  langs?: string,
  oem?: number,
  options?: {
    logger?: (message: { status: string; progress: number }) => void;
  },
) => Promise<OcrWorker>;

async function loadTesseract(onProgress?: (message: string) => void): Promise<CreateWorker> {
  const imported = (await import("tesseract.js")) as unknown as {
    createWorker?: CreateWorker;
    default?: { createWorker?: CreateWorker };
  };
  const createWorker = imported.createWorker ?? imported.default?.createWorker;
  if (!createWorker) {
    throw new Error("The on-device OCR engine did not load.");
  }
  if (onProgress) onProgress("Loading the on-device reader");
  return createWorker;
}

export async function recognizeLines(
  image: Blob,
  onProgress?: (message: string) => void,
): Promise<OcrWord[][]> {
  const createWorker = await loadTesseract(onProgress);
  const worker = await createWorker("eng", 1, {
    logger: (message) => {
      const percent = Math.round((message.progress ?? 0) * 100);
      onProgress?.(`${message.status} ${percent}%`);
    },
  });
  try {
    const result = await worker.recognize(image, {}, { text: true, blocks: true });
    const lines: OcrWord[][] = [];
    for (const block of result.data.blocks ?? []) {
      for (const paragraph of block.paragraphs ?? []) {
        for (const line of paragraph.lines ?? []) {
          const words = (line.words ?? [])
            .map((word) => ({ text: word.text, bbox: word.bbox }))
            .filter((word) => word.text.trim().length > 0);
          if (words.length > 0) lines.push(words);
        }
      }
    }
    if (lines.length === 0) {
      throw new Error("The image was read, but no words were found. Try a sharper screenshot.");
    }
    return lines;
  } finally {
    await worker.terminate();
  }
}

export function joinOcrLines(lines: OcrWord[][]): {
  text: string;
  spans: { word: OcrWord; start: number; end: number }[];
} {
  let text = "";
  const spans: { word: OcrWord; start: number; end: number }[] = [];
  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) text += "\n";
    line.forEach((word, wordIndex) => {
      const token = word.text.trim();
      if (!token) return;
      if (wordIndex > 0) text += " ";
      const start = text.length;
      text += token;
      spans.push({ word, start, end: text.length });
    });
  });
  return { text, spans };
}

export function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    image.src = url;
  });
}

export async function paintRedactions(
  image: HTMLImageElement,
  words: OcrWord[],
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not draw the redacted image.");
  context.drawImage(image, 0, 0);
  context.fillStyle = "#1c1915";
  for (const word of words) {
    const pad = 2;
    context.fillRect(
      word.bbox.x0 - pad,
      word.bbox.y0 - pad,
      word.bbox.x1 - word.bbox.x0 + pad * 2,
      word.bbox.y1 - word.bbox.y0 + pad * 2,
    );
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not export the redacted image.");
  return blob;
}

const SAMPLE_LINES = [
  "VALLEY PAPER CLINIC",
  "1842 Valencia Street, San Francisco, CA 94110",
  "Phone: (415) 555-0148",
  "Patient: Mara Ellison",
  "DOB: 03/14/1986",
  "MRN: 00482193",
  "Member ID: XTR-4491208",
  "SSN: 453-22-1890",
  "Email: mara.ellison@example.com",
  "Diagnosis: Type 2 diabetes mellitus (E11.9)",
  "Medications: Metformin 500 mg",
  "Date of service: 11/02/2026",
  "Amount due: $186.40",
  "FICTIONAL SAMPLE. Not a real patient.",
];

export async function renderSampleBill(): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 980;
  canvas.height = 860;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not draw the sample bill.");
  context.fillStyle = "#fffdf8";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#1d4f4a";
  context.lineWidth = 8;
  context.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);
  context.fillStyle = "#1c1915";
  context.font = "600 28px Georgia, serif";
  context.fillText("Patient statement", 64, 90);
  context.font = "28px Georgia, serif";
  SAMPLE_LINES.forEach((line, index) => {
    context.fillText(line, 64, 160 + index * 46);
  });
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not export the sample bill.");
  return blob;
}
