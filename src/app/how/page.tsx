import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How it works",
  description: "How PlainSight keeps medical paperwork on the device until you approve an outbox.",
};

const STEPS = [
  {
    title: "The paperwork stays here",
    body: "A bill, lab result, intake form, or screenshot is read in the browser. The first pass is a deterministic detector: names on labeled lines, dates of birth, medical record numbers, insurance IDs, addresses, phone numbers, SSNs, email, diagnoses, and medications.",
  },
  {
    title: "You see the outbox",
    body: "The original and the redacted copy sit side by side. Every removal is marked. Nothing is copied to the clipboard, and nothing is written to the ledger, until you approve.",
  },
  {
    title: "Rules sound like speech",
    body: "“Never send my kid’s name Maya Chen” becomes a literal redaction. “Keep insurance IDs, hide everything else” leaves member IDs visible and covers the rest. Rule text is parsed on this device.",
  },
  {
    title: "The ledger remembers the redacted copy",
    body: "IndexedDB stores the time, the destination, the counts, and a preview of what was approved. You can export that log or clear it. The original is not in the record.",
  },
];

export default function HowPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <header>
        <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">How it works</p>
        <h1 className="mt-2 font-heading text-4xl tracking-tight text-balance">
          A privacy layer in front of the chatbot.
        </h1>
        <p className="mt-3 text-muted-foreground">
          PlainSight is for patients, caregivers, and front-desk staff who paste medical paperwork into
          AI tools. It is the pause between the document and the send button.
        </p>
      </header>
      <ol className="flex flex-col gap-4">
        {STEPS.map((step, index) => (
          <li key={step.title} className="paper-panel rounded-xl p-4">
            <p className="text-sm text-primary">0{index + 1}</p>
            <h2 className="font-heading text-2xl">{step.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
      <section className="paper-panel rounded-xl p-4">
        <h2 className="font-heading text-2xl">Which computer actually read it</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          When Firebase is configured and Gemini Nano is ready in Chrome, the model runs on the device
          through Firebase AI Logic in prefer-on-device mode. If Nano is unavailable, PlainSight does not
          call the cloud on its own. You can choose to send the already-redacted text, and the badge on
          the outbox says which path ran. Screenshot pixels are read with on-device OCR and are not uploaded.
        </p>
        <p className="mt-3 text-sm">
          <Link href="/" className="text-primary underline-offset-4 hover:underline">
            Open the outbox
          </Link>
        </p>
      </section>
    </div>
  );
}
