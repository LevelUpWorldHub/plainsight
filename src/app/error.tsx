"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="paper-panel max-w-xl rounded-xl p-6">
      <h1 className="font-heading text-3xl">This page stopped.</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {error.message || "PlainSight hit an unexpected error. Your ledger is still on this device."}
      </p>
      <Button type="button" className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
