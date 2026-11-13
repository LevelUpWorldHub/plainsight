import type { Metadata } from "next";
import { OutboxWorkbench } from "@/components/outbox-workbench";

export const metadata: Metadata = {
  title: "Outbox",
  description: "Compare the original document with the exact text that can leave this device.",
};

export default function HomePage() {
  return <OutboxWorkbench />;
}
