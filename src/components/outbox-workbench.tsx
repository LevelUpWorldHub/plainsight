"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DiffView } from "@/components/diff-view";
import { FindingSummary } from "@/components/finding-summary";
import { PathBadge, ScanTraceNote } from "@/components/path-badge";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  RULES_CHANGED,
  addLedgerEntry,
  createLedgerEntry,
  listStoredRules,
  notifyLedgerChanged,
} from "@/lib/phi/ledger";
import { charactersHeld } from "@/lib/phi/redact";
import { runScan } from "@/lib/phi/run-scan";
import { SAMPLE_DOCUMENTS, fetchSample } from "@/lib/phi/samples";
import { DESTINATIONS, type PrivacyRule, type ScanResult } from "@/lib/phi/types";

export function OutboxWorkbench() {
  const [text, setText] = useState("");
  const [destination, setDestination] = useState<(typeof DESTINATIONS)[number]>("ChatGPT");
  const [rules, setRules] = useState<PrivacyRule[]>([]);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [status, setStatus] = useState<"idle" | "scanning" | "saving">("idle");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [download, setDownload] = useState<number | null>(null);
  const [cue, setCue] = useState("");

  useEffect(() => {
    const load = () => {
      listStoredRules<PrivacyRule>()
        .then(setRules)
        .catch(() => setRules([]));
    };
    load();
    window.addEventListener(RULES_CHANGED, load);
    return () => window.removeEventListener(RULES_CHANGED, load);
  }, []);

  const stale = Boolean(result && result.original !== text);
  const configured = isFirebaseConfigured();

  async function scan(allowCloud: boolean, source = text): Promise<ScanResult | null> {
    if (!source.trim()) {
      setError("Paste a document or load a sample first.");
      return null;
    }
    setText(source);
    setError("");
    setNotice("");
    setStatus("scanning");
    setDownload(null);
    try {
      const model = configured
        ? (await import("@/lib/firebase/model-runner")).createFirebaseModelRunner()
        : undefined;
      const next = await runScan(source, rules, {
        firebaseConfigured: configured,
        allowCloud,
        model,
        onDownloadProgress: (ratio) => setDownload(ratio),
      });
      setResult(next);
      return next;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The scan failed on this device.");
      return null;
    } finally {
      setStatus("idle");
    }
  }

  async function runDeskDemo() {
    setCue("");
    setDestination("ChatGPT");
    const sample = await fetchSample("medical-bill.txt");
    const next = await scan(false, sample);
    if (!next) return;
    const held = charactersHeld(next.findings);
    setCue(
      `Step 1 of the front desk. ${next.findings.length} spans and ${held} characters stay on this device. The service date and the amount due are still in the outbox. Approve only the right-hand column.`,
    );
  }

  async function runMissDemo() {
    const sample = await fetchSample("caregiver-note.txt");
    const next = await scan(false, sample);
    if (!next) return;
    setCue(
      next.redacted.includes("Maya Chen")
        ? "Step 2. Maya Chen is still in the outbox, because the name is only in a sentence. Sertraline was caught. Open Rules, save “never send my kid's name Maya Chen,” and scan again."
        : "Step 2. A rule on this device already hid Maya Chen. The outbox is the text that can leave.",
    );
  }

  async function loadSample(file: string) {
    setError("");
    setNotice("");
    try {
      setText(await fetchSample(file));
      setResult(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The sample did not load.");
    }
  }

  async function approve() {
    if (!result || stale) return;
    setStatus("saving");
    setError("");
    try {
      const entry = createLedgerEntry({
        destination,
        findings: result.findings,
        redacted: result.redacted,
        path: result.path,
        kind: "text",
      });
      await addLedgerEntry(entry);
      notifyLedgerChanged();
      await navigator.clipboard.writeText(result.redacted);
      setNotice(`Copied the redacted text for ${destination}. The original stayed in this browser.`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `${cause.message} The outbox is still on screen if the clipboard was blocked.`
          : "Could not finish the approval.",
      );
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="max-w-3xl">
        <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">Outbox</p>
        <h1 className="mt-2 font-heading text-4xl tracking-tight text-balance sm:text-5xl">
          See exactly what will leave this device.
        </h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">
          Paste a bill, an EOB, a lab result, or an intake form. PlainSight marks personal and medical
          details here, then waits for you to approve the copy that can be sent.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="flex flex-col gap-2">
          <Label htmlFor="document">Document</Label>
          <Textarea
            id="document"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Paste the paperwork you were about to drop into a chatbot."
            className="min-h-72 font-mono text-sm"
          />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="destination">Destination</Label>
            <select
              id="destination"
              value={destination}
              onChange={(event) => setDestination(event.target.value as (typeof DESTINATIONS)[number])}
              className="h-10 rounded-lg border border-input bg-card px-2.5 text-sm"
            >
              {DESTINATIONS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Fictional samples</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_DOCUMENTS.map((sample) => (
                <Button
                  key={sample.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => loadSample(sample.file)}
                >
                  {sample.title}
                </Button>
              ))}
            </div>
          </div>
          <Button
            type="button"
            size="lg"
            className="h-11"
            disabled={status === "scanning"}
            onClick={() => {
              setCue("");
              void scan(false);
            }}
          >
            {status === "scanning" ? "Reading on this device…" : "Scan on this device"}
          </Button>
          <Button type="button" variant="outline" disabled={status === "scanning"} onClick={() => void runDeskDemo()}>
            Run the front-desk demo
          </Button>
          {status === "scanning" ? (
            <p role="status" className="text-sm text-muted-foreground">
              {download !== null
                ? `Gemini Nano download ${Math.round(download * 100)}%. The document stays here while it finishes.`
                : "Reading on this device. Nothing has been sent."}
            </p>
          ) : null}
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {cue ? (
        <section className="paper-panel rounded-xl p-4" aria-live="polite">
          <h2 className="font-heading text-xl">What a judge should see</h2>
          <p className="mt-2 text-sm leading-6">{cue}</p>
          <Button type="button" variant="outline" className="mt-3" disabled={status === "scanning"} onClick={() => void runMissDemo()}>
            Step 2: the name in a sentence
          </Button>
        </section>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
          {notice}
        </p>
      ) : null}

      {!result ? (
        <section className="paper-panel grid gap-4 rounded-xl p-4 sm:grid-cols-3">
          {[
            ["1", "Load paperwork", "Use a fictional sample or paste the note you were about to send."],
            ["2", "Scan here", "Names, record numbers, and medications are marked before any model call."],
            ["3", "Approve the outbox", "The side you approve is the only text copied, and the only text logged."],
          ].map(([step, title, body]) => (
            <div key={step}>
              <p className="font-heading text-2xl text-primary">{step}</p>
              <h2 className="mt-1 font-medium">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-2">
              <PathBadge path={result.path} />
              <p className="max-w-2xl text-sm text-muted-foreground">{result.detail}</p>
              <ScanTraceNote trace={result.trace} />
            </div>
            <p className="text-sm text-muted-foreground">
              {rules.length === 0
                ? "No plain-English rules yet."
                : `${rules.length} rule${rules.length === 1 ? "" : "s"} applied.`}
            </p>
          </div>
          {stale ? (
            <p role="status" className="text-sm text-destructive">
              The document changed after this scan. Scan again before approving.
            </p>
          ) : null}
          <FindingSummary findings={result.findings} originalLength={result.original.length} />
          <DiffView original={result.original} redacted={result.redacted} findings={result.findings} />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              size="lg"
              className="h-11"
              disabled={stale || status !== "idle"}
              onClick={approve}
            >
              {status === "saving" ? "Saving the outbox…" : `Approve and copy for ${destination}`}
            </Button>
          </div>
          {result.cloudOffer ? (
            <div className="paper-panel rounded-xl p-4">
              <h2 className="font-heading text-xl">Optional cloud check</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Gemini Nano is not ready. If you continue, cloud Gemini receives only the text in this box.
                Known identifiers are already replaced. Anything the local detector missed is still visible here.
              </p>
              <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs whitespace-pre-wrap">
                {result.cloudOffer}
              </pre>
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                disabled={status === "scanning" || stale}
                onClick={() => scan(true)}
              >
                Send this redacted text to the cloud
              </Button>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
