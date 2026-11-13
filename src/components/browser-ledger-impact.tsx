"use client";

import { useEffect, useState } from "react";
import { listLedger } from "@/lib/phi/ledger";
import type { LedgerEntry } from "@/lib/phi/types";

export function BrowserLedgerImpact() {
  const [entries, setEntries] = useState<LedgerEntry[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    listLedger()
      .then((rows) => {
        if (active) setEntries(rows);
      })
      .catch(() => {
        if (active) setError("The ledger on this device could not be read.");
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!entries) return <p className="text-sm text-muted-foreground">Reading the ledger on this device.</p>;
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This browser has not approved an outbox yet. The totals above are the fictional paperwork, measured by the detector, not a send.
      </p>
    );
  }
  const redactions = entries.reduce((sum, entry) => sum + entry.totalRedactions, 0);
  const held = entries.reduce((sum, entry) => sum + (entry.charactersHeld ?? 0), 0);
  return (
    <p className="text-sm">
      This browser has approved {entries.length} outbox {entries.length === 1 ? "entry" : "entries"}: {redactions} redactions and {held.toLocaleString()} characters held back. The original documents are not in that log.
    </p>
  );
}
