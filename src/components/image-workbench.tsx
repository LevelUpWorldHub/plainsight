"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DiffView } from "@/components/diff-view";
import { FindingSummary } from "@/components/finding-summary";
import { PathBadge } from "@/components/path-badge";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { createFirebaseModelRunner } from "@/lib/firebase/model-runner";
import {
  joinOcrLines,
  loadImage,
  paintRedactions,
  recognizeLines,
  renderSampleBill,
} from "@/lib/image/redact-image";
import { wordsOverlappingFindings } from "@/lib/phi/ocr-map";
import { addLedgerEntry, createLedgerEntry, notifyLedgerChanged } from "@/lib/phi/ledger";
import { listStoredRules } from "@/lib/phi/ledger";
import { runScan } from "@/lib/phi/run-scan";
import type { Finding, PrivacyRule, ScanResult } from "@/lib/phi/types";

export function ImageWorkbench() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [redactedUrl, setRedactedUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [rules, setRules] = useState<PrivacyRule[]>([]);
  const urls = useState<string[]>([])[0];

  useEffect(() => {
    listStoredRules<PrivacyRule>().then(setRules).catch(() => setRules([]));
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [urls]);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const file = [...(event.clipboardData?.files ?? [])].find((item) => item.type.startsWith("image/"));
      if (file) {
        event.preventDefault();
        void inspect(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  async function inspect(file: Blob) {
    setBusy(true);
    setError("");
    setNotice("");
    setResult(null);
    setProgress("Reading the image on this device. The picture is not uploaded.");
    try {
      const image = await loadImage(file);
      const lines = await recognizeLines(file, setProgress);
      const joined = joinOcrLines(lines);
      const scan = await runScan(joined.text, rules, {
        firebaseConfigured: isFirebaseConfigured(),
        allowCloud: false,
        model: isFirebaseConfigured() ? createFirebaseModelRunner() : undefined,
      });
      const covered = wordsOverlappingFindings(joined.spans, scan.findings);
      const redacted = await paintRedactions(image, covered);
      const originalUrl = URL.createObjectURL(file);
      const redactedUrlNext = URL.createObjectURL(redacted);
      urls.push(originalUrl, redactedUrlNext);
      setPreviewUrl(originalUrl);
      setRedactedUrl(redactedUrlNext);
      setResult(scan);
      setProgress("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The image could not be read on this device.");
      setProgress("");
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!result) return;
    const entry = createLedgerEntry({
      destination: "Screenshot",
      findings: result.findings,
      redacted: result.redacted,
      path: result.path === "cloud" ? "heuristic_only" : result.path,
      kind: "image",
    });
    await addLedgerEntry(entry);
    notifyLedgerChanged();
    setNotice("Logged the redacted reading. The picture itself is not stored in the ledger.");
  }

  function download() {
    if (!redactedUrl) return;
    const link = document.createElement("a");
    link.href = redactedUrl;
    link.download = "plainsight-redacted.png";
    link.click();
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="max-w-3xl">
        <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">Screenshot</p>
        <h1 className="mt-2 font-heading text-4xl tracking-tight text-balance">
          Black out a photo of the paperwork.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Drop or paste a screenshot. PlainSight reads it with on-device OCR, then paints over the words
          it would redact. The image is not sent to a cloud model.
        </p>
      </header>

      <div
        className="paper-panel rounded-xl border-dashed p-6 text-center"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = [...event.dataTransfer.files].find((item) => item.type.startsWith("image/"));
          if (file) void inspect(file);
          else setError("Drop an image file.");
        }}
      >
        <p className="font-medium">Drop a screenshot, or paste one.</p>
        <p className="mt-1 text-sm text-muted-foreground">PNG or JPEG. The first read downloads the English OCR model, not your image.</p>
        <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <label className="inline-flex">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void inspect(file);
              }}
            />
            <span className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-border bg-background px-3 text-sm">
              Choose an image
            </span>
          </label>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void renderSampleBill().then(inspect)}>
            Render the sample bill
          </Button>
        </div>
      </div>

      {progress ? <p className="text-sm text-muted-foreground">{progress}</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {notice ? <p className="text-sm">{notice}</p> : null}

      {previewUrl && redactedUrl && result ? (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <PathBadge path={result.path} />
            <p className="text-sm text-muted-foreground">
              OCR ran in this browser. {result.detail}
            </p>
          </div>
          <FindingSummary findings={result.findings as Finding[]} />
          <div className="grid gap-3 lg:grid-cols-2">
            <figure className="paper-panel rounded-xl p-3">
              <figcaption className="mb-2 text-sm font-medium">Original image, held here</figcaption>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Original screenshot" className="h-auto w-full rounded-md" />
            </figure>
            <figure className="paper-panel rounded-xl p-3">
              <figcaption className="mb-2 text-sm font-medium">Redacted image</figcaption>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={redactedUrl} alt="Screenshot with personal details covered" className="h-auto w-full rounded-md" />
            </figure>
          </div>
          <DiffView original={result.original} redacted={result.redacted} findings={result.findings} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void approve()}>
              Approve and log the redacted reading
            </Button>
            <Button type="button" variant="outline" onClick={download}>
              Download redacted image
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
