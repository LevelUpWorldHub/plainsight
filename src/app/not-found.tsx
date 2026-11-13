import Link from "next/link";

export default function NotFound() {
  return (
    <div className="paper-panel max-w-xl rounded-xl p-6">
      <h1 className="font-heading text-3xl">That page is not in PlainSight.</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The outbox, screenshot tool, rules, and ledger are the pages that exist.
      </p>
      <Link href="/" className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline">
        Back to the outbox
      </Link>
    </div>
  );
}
