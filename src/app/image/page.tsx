import type { Metadata } from "next";
import { ImageWorkbench } from "@/components/image-workbench";

export const metadata: Metadata = {
  title: "Screenshot",
  description: "Redact a screenshot of medical paperwork on this device.",
};

export default function ImagePage() {
  return <ImageWorkbench />;
}
