"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PathBadge } from "@/components/path-badge";
import {
  LEDGER_CHANGED,
  clearLedger,
  ledgerToJson,
  listLedger,
  notifyLedgerChanged,
} from "@/lib/phi/ledger";
import type { LedgerEntry } from "@/lib/phi/types";

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function LedgerWorkbench() {
  const [entries, setEntries] = useState<LedgerEntry[] | null>(null);
  const [error, setError] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  async function refresh() {
    try {
      setEntries(await listLedger());
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The ledger could not be read.");
      setEntries([]);
    }
  }

  useEffect(() => {
    const load = () => {
      void refresh();
    };
    load();
    window.addEventListener(LEDGER_CHANGED, load);
    return () => window.removeEventListener(LEDGER_CHANGED, load);
  }, []);

  function exportJson() {
    if (!entries) return;
    const blob = new Blob([ledgerToJson(entries)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plainsight-ledger.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function wipe() {
    await clearLedger();
    notifyLedgerChanged();
    setConfirmClear(false);
    await refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">Ledger</p>
          <h1 className="mt-2 font-heading text-4xl tracking-tight text-balance">
            What has left this device.
          </h1>
          <p className="mt-3 text-muted-foreground">
            Each approved outbox is stored in IndexedDB on this browser. The preview is the redacted
            payload. The original document is not in this log.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={exportJson} disabled={!entries?.length}>
            Export JSON
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirmClear(true)}
            disabled={!entries?.length}
          >
            Clear ledger
          </Button>
        </div>
      </header>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {entries === null ? (
        <p className="text-sm text-muted-foreground">Opening the ledger on this device…</p>
      ) : entries.length === 0 ? (
        <section className="paper-panel rounded-xl p-6">
          <h2 className="font-heading text-2xl">Nothing has been approved yet.</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            When you approve an outbox, the time, destination, redaction counts, and redacted preview
            land here. You can export the log or clear it without touching any other system.
          </p>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => {
            const open = openId === entry.id;
            return (
              <li key={entry.id} className="paper-panel rounded-xl p-4">
                <button
                  type="button"
                  className="flex w-full flex-col gap-2 text-left sm:flex-row sm:items-center sm:justify-between"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : entry.id)}
                >
                  <span>
                    <span className="block font-medium">
                      {entry.destination} · {entry.kind === "image" ? "Screenshot" : "Text"}
                    </span>
                    <span className="text-sm text-muted-foreground">{formatWhen(entry.timestamp)}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <PathBadge path={entry.path} />
                    <span className="text-sm">{entry.totalRedactions} redactions</span>
                  </span>
                </button>
                {open ? (
                  <pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs whitespace-pre-wrap">
                    {entry.redactedPreview || "The redacted payload was empty."}
                  </pre>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear the local ledger?</DialogTitle>
            <DialogDescription>
              This deletes every approved outbox stored in this browser. It does not change an AI account
              or a clinic system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmClear(false)}>
              Keep the ledger
            </Button>
            <Button type="button" variant="destructive" onClick={() => void wipe()}>
              Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
