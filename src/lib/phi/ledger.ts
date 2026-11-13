import { charactersHeld, countByType } from "./redact";
import type { Finding, InferencePath, LedgerEntry } from "./types";

const DB_NAME = "plainsight";
const DB_VERSION = 1;
const LEDGER = "ledger";
const RULES = "rules";

export function createLedgerEntry(input: {
  destination: string;
  findings: Finding[];
  redacted: string;
  path: InferencePath;
  kind: "text" | "image";
  now?: Date;
  id?: string;
}): LedgerEntry {
  const preview = input.redacted.replace(/\s+/g, " ").trim().slice(0, 280);
  return {
    id: input.id ?? crypto.randomUUID(),
    timestamp: (input.now ?? new Date()).toISOString(),
    destination: input.destination,
    redactionCounts: countByType(input.findings),
    totalRedactions: input.findings.length,
    charactersHeld: charactersHeld(input.findings),
    path: input.path,
    redactedPreview: preview,
    kind: input.kind,
  };
}

export function ledgerContainsOriginal(
  entry: LedgerEntry,
  original: string,
): boolean {
  if (!original) return false;
  const serialized = JSON.stringify(entry);
  return serialized.includes(original);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available on this device."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LEDGER)) {
        db.createObjectStore(LEDGER, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(RULES)) {
        db.createObjectStore(RULES, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the local ledger."));
  });
}

function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const request = run(tx.objectStore(storeName));
        tx.oncomplete = () => {
          resolve(request.result);
          db.close();
        };
        tx.onerror = () => {
          reject(tx.error ?? request.error ?? new Error("Local database request failed."));
          db.close();
        };
        tx.onabort = () => {
          reject(tx.error ?? new Error("Local database request was aborted."));
          db.close();
        };
      }),
  );
}

export async function listLedger(): Promise<LedgerEntry[]> {
  const rows = await withStore<LedgerEntry[]>(LEDGER, "readonly", (store) => store.getAll());
  return rows.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

export async function addLedgerEntry(entry: LedgerEntry): Promise<void> {
  await withStore(LEDGER, "readwrite", (store) => store.put(entry));
}

export async function clearLedger(): Promise<void> {
  await withStore(LEDGER, "readwrite", (store) => store.clear());
}

export function ledgerToJson(entries: LedgerEntry[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      note: "Redacted previews only. PlainSight does not store the original document in this ledger.",
      entries,
    },
    null,
    2,
  );
}

export async function listStoredRules<T extends { id: string; createdAt: string }>(): Promise<T[]> {
  const rows = await withStore<T[]>(RULES, "readonly", (store) => store.getAll());
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function saveStoredRule<T extends { id: string }>(rule: T): Promise<void> {
  await withStore(RULES, "readwrite", (store) => store.put(rule));
}

export async function deleteStoredRule(id: string): Promise<void> {
  await withStore(RULES, "readwrite", (store) => store.delete(id));
}

export const RULES_CHANGED = "plainsight-rules";
export const LEDGER_CHANGED = "plainsight-ledger";

export function notifyRulesChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(RULES_CHANGED));
}

export function notifyLedgerChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(LEDGER_CHANGED));
}
