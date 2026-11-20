#!/usr/bin/env node
/**
 * Copy tesseract.js worker, LSTM wasm cores, and the English traineddata
 * into public/tesseract so Screenshot OCR runs same-origin under the
 * existing CSP (no CDN script-src / worker-src relaxation).
 */
import { copyFileSync, mkdirSync, existsSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, "public", "tesseract");
const workerSrc = join(root, "node_modules", "tesseract.js", "dist", "worker.min.js");
const coreDir = join(root, "node_modules", "tesseract.js-core");
const cores = [
  "tesseract-core-lstm.wasm.js",
  "tesseract-core-simd-lstm.wasm.js",
  "tesseract-core-relaxedsimd-lstm.wasm.js",
];
const trainedUrl =
  "https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz";

if (!existsSync(workerSrc) || !existsSync(coreDir)) {
  throw new Error("tesseract.js and tesseract.js-core must be installed before vendoring.");
}

mkdirSync(dest, { recursive: true });

function copyIfStale(from, to) {
  if (existsSync(to) && statSync(to).size === statSync(from).size && statSync(to).mtimeMs >= statSync(from).mtimeMs) {
    return;
  }
  copyFileSync(from, to);
}

copyIfStale(workerSrc, join(dest, "worker.min.js"));
for (const name of cores) {
  const from = join(coreDir, name);
  if (!existsSync(from)) throw new Error(`Missing tesseract core file: ${name}`);
  copyIfStale(from, join(dest, name));
}

const trainedDest = join(dest, "eng.traineddata.gz");
if (!existsSync(trainedDest) || statSync(trainedDest).size < 1000) {
  const response = await fetch(trainedUrl);
  if (!response.ok) {
    throw new Error(`Failed to download eng.traineddata.gz: ${response.status} ${response.statusText}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  writeFileSync(trainedDest, bytes);
}

console.log(`Vendored tesseract assets into ${dest}`);
