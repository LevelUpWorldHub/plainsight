import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { BrowserLedgerImpact } from "@/components/browser-ledger-impact";
import { heldPercent, measureDocument, sumImpact } from "@/lib/phi/impact";
import { SAMPLE_DOCUMENTS } from "@/lib/phi/samples";
import { ENTITY_LABELS, ENTITY_TYPES } from "@/lib/phi/types";

export const metadata: Metadata = {
  title: "Impact",
  description: "How many identifiers the on-device detector holds back in the fictional paperwork.",
};

function loadSample(file: string): string {
  return readFileSync(path.join(process.cwd(), "samples", file), "utf8");
}

export default function ImpactPage() {
  const rows = SAMPLE_DOCUMENTS.map((sample) => {
    const text = loadSample(sample.file);
    return { sample, impact: measureDocument(text) };
  });
  const total = sumImpact(rows.map((row) => row.impact));
  const percent = heldPercent(total);

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-3xl">
        <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">Impact</p>
        <h1 className="mt-2 font-heading text-4xl tracking-tight text-balance">
          {total.charactersHeld.toLocaleString()} characters would have left with the paperwork.
        </h1>
        <p className="mt-3 text-muted-foreground">
          These figures are computed on this device by the same detector the outbox uses, against the {rows.length} fictional files in <span className="font-mono">samples/</span>. They are not a national statistic and they are not a live clinic.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          [total.redactions.toLocaleString(), "Identifiers marked"],
          [`${percent}%`, "Of those documents held back"],
          [rows.length.toString(), "Fictional files measured"],
        ].map(([value, label]) => (
          <article key={label} className="paper-panel rounded-xl p-4">
            <p className="font-heading text-4xl text-primary">{value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{label}</p>
          </article>
        ))}
      </section>

      <section className="paper-panel rounded-xl p-4">
        <h2 className="font-heading text-2xl">By identifier</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {ENTITY_TYPES.filter((type) => (total.byType[type] ?? 0) > 0).map((type) => (
            <li key={type} className="flex items-baseline justify-between gap-3 border-b border-border py-2 text-sm">
              <span>{ENTITY_LABELS[type]}</span>
              <span className="font-mono">{total.byType[type]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-heading text-2xl">Per document</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <caption className="sr-only">Identifiers and characters held in each fictional sample</caption>
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th scope="col" className="py-2 pr-3 font-medium">File</th>
                <th scope="col" className="py-2 pr-3 font-medium">Redactions</th>
                <th scope="col" className="py-2 pr-3 font-medium">Characters held</th>
                <th scope="col" className="py-2 font-medium">Share</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ sample, impact }) => (
                <tr key={sample.id} className="border-b border-border">
                  <th scope="row" className="py-2 pr-3 font-medium">{sample.title}</th>
                  <td className="py-2 pr-3 font-mono">{impact.redactions}</td>
                  <td className="py-2 pr-3 font-mono">{impact.charactersHeld}</td>
                  <td className="py-2 font-mono">{heldPercent(impact)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="paper-panel rounded-xl p-4">
        <h2 className="font-heading text-2xl">Approved on this browser</h2>
        <div className="mt-2">
          <BrowserLedgerImpact />
        </div>
      </section>
    </div>
  );
}
