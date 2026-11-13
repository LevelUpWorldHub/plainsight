import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { createFirebaseModelRunner } from "@/lib/firebase/model-runner";
import {
  addLedgerEntry,
  createLedgerEntry,
  listStoredRules,
  notifyLedgerChanged,
} from "@/lib/phi/ledger";
import { runScan } from "@/lib/phi/run-scan";
import type { PrivacyRule, ScanResult } from "@/lib/phi/types";
import { EXTENSION_SAMPLES } from "./samples";
import "./sidepanel.css";

interface PendingPayload {
  text: string;
  destination: string;
  tabId: number | null;
}

const TOKEN = /\[(?:NAME|DATE OF BIRTH|MRN|INSURANCE ID|ADDRESS|PHONE|SSN|EMAIL|DIAGNOSIS|MEDICATION)\]/g;

function badgeClass(path: ScanResult["path"]): string {
  return path === "cloud" ? "badge cloud" : "badge";
}

function badgeLabel(path: ScanResult["path"]): string {
  if (path === "on_device") return "On-device · Gemini Nano";
  if (path === "cloud") return "Cloud fallback · redacted text only";
  return "On-device heuristic";
}

function shotSample(): string {
  if (new URLSearchParams(location.search).get("shot") !== "1") return "";
  return EXTENSION_SAMPLES[0]?.text ?? "";
}

function SidePanel() {
  const [text, setText] = useState(shotSample);
  const [destination, setDestination] = useState("ChatGPT");
  const [tabId, setTabId] = useState<number | null>(null);
  const [rules, setRules] = useState<PrivacyRule[]>([]);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (new URLSearchParams(location.search).get("shot") === "1") {
      const sample = EXTENSION_SAMPLES[0]?.text ?? "";
      void runScan(sample, [], { firebaseConfigured: false, allowCloud: false }).then(setResult);
    }
    listStoredRules<PrivacyRule>().then(setRules).catch(() => setRules([]));
    const chromeApi = globalThis.chrome;
    if (!chromeApi?.storage?.session || !chromeApi.storage.onChanged) return;
    const apply = (pending?: PendingPayload) => {
      if (!pending) return;
      setText(pending.text ?? "");
      setDestination(pending.destination || "ChatGPT");
      setTabId(pending.tabId ?? null);
      setResult(null);
    };
    chromeApi.storage.session.get("pending").then((stored) => {
      apply(stored.pending as PendingPayload | undefined);
      if (stored.pending) void chromeApi.storage.session.remove("pending");
    });
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string,
    ) => {
      if (area === "session" && changes.pending?.newValue) {
        apply(changes.pending.newValue as PendingPayload);
      }
    };
    chromeApi.storage.onChanged.addListener(listener);
    return () => chromeApi.storage.onChanged.removeListener(listener);
  }, []);

  async function scan(allowCloud: boolean) {
    if (!text.trim()) {
      setError("Nothing to scan yet. Focus a text box and choose Check with PlainSight.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const configured = isFirebaseConfigured();
      setResult(
        await runScan(text, rules, {
          firebaseConfigured: configured,
          allowCloud,
          model: configured ? createFirebaseModelRunner() : undefined,
        }),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The scan failed.");
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!result) return;
    setBusy(true);
    setError("");
    try {
      await addLedgerEntry(
        createLedgerEntry({
          destination,
          findings: result.findings,
          redacted: result.redacted,
          path: result.path,
          kind: "text",
        }),
      );
      notifyLedgerChanged();
      if (tabId !== null) {
        await chrome.runtime.sendMessage({
          type: "REPLACE_FIELD",
          tabId,
          text: result.redacted,
        });
        setNotice("Replaced the field with the redacted text and logged the outbox.");
      } else {
        await navigator.clipboard.writeText(result.redacted);
        setNotice("Copied the redacted text. The original was not logged.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not apply the outbox.");
    } finally {
      setBusy(false);
    }
  }

  const redactedParts = result ? result.redacted.split(TOKEN) : [];
  const tokens = result?.redacted.match(TOKEN) ?? [];

  return (
    <div className="app">
      <header>
        <h1 className="mark">
          Plain<span>Sight</span>
        </h1>
        <p className="lede">Approve the redacted text before it goes into the chat box.</p>
      </header>
      <label>
        Destination
        <select value={destination} onChange={(event) => setDestination(event.target.value)}>
          {["ChatGPT", "Gemini", "Claude", "Clinic web form", "Selection", "Other"].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label>
        Text that is about to be sent
        <textarea value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      <div className="samples">
        {EXTENSION_SAMPLES.map((sample) => (
          <button
            key={sample.title}
            type="button"
            className="secondary"
            onClick={() => {
              setText(sample.text);
              setResult(null);
            }}
          >
            {sample.title}
          </button>
        ))}
      </div>
      <button type="button" disabled={busy} onClick={() => void scan(false)}>
        {busy ? "Reading…" : "Scan on this device"}
      </button>
      {error ? <p className="error">{error}</p> : null}
      {notice ? <p className="notice">{notice}</p> : null}
      {result ? (
        <>
          <span className={badgeClass(result.path)}>{badgeLabel(result.path)}</span>
          <p className="detail">{result.detail}</p>
          <p className="detail">
            prefer_on_device · payload {result.trace.payload} · {result.trace.charactersSent} characters · source {result.trace.inferenceSource}
          </p>
          <section className="pane">
            <h2>Will leave the device</h2>
            <p>
              {redactedParts.map((part, index) => (
                <span key={index}>
                  {part}
                  {tokens[index] ? <mark className="token">{tokens[index]}</mark> : null}
                </span>
              ))}
            </p>
          </section>
          <div className="row">
            <button type="button" disabled={busy || result.original !== text} onClick={() => void approve()}>
              Approve redacted text
            </button>
          </div>
          {result.cloudOffer ? (
            <section className="pane">
              <h2>Cloud would receive this</h2>
              <p>{result.cloudOffer}</p>
              <button type="button" className="secondary" disabled={busy} onClick={() => void scan(true)}>
                Send redacted text only
              </button>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<SidePanel />);
