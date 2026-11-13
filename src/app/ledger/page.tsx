import type { Metadata } from "next";
import { LedgerWorkbench } from "@/components/ledger-workbench";

export const metadata: Metadata = {
  title: "Ledger",
  description: "A local log of redacted payloads that were approved to leave this device.",
};

export default function LedgerPage() {
  return <LedgerWorkbench />;
}
