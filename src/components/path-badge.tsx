import { Badge } from "@/components/ui/badge";
import type { InferencePath } from "@/lib/phi/types";

const LABELS: Record<InferencePath, string> = {
  on_device: "On-device · Gemini Nano",
  cloud: "Cloud fallback · redacted text only",
  heuristic_only: "On-device heuristic",
};

export function PathBadge({ path }: { path: InferencePath }) {
  return (
    <Badge
      variant={path === "cloud" ? "destructive" : "secondary"}
      className="h-auto px-2 py-1 whitespace-normal"
    >
      {LABELS[path]}
    </Badge>
  );
}
