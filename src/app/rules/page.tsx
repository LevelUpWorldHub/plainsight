import type { Metadata } from "next";
import { RulesWorkbench } from "@/components/rules-workbench";

export const metadata: Metadata = {
  title: "Rules",
  description: "Turn a plain-English privacy rule into a check that stays on this device.",
};

export default function RulesPage() {
  return <RulesWorkbench />;
}
