import { Badge } from "@/components/ui/badge";
import type { InferencePath, ScanTrace } from "@/lib/phi/types";

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

export function ScanTraceNote({ trace }: { trace: ScanTrace }) {
  const sent =
    trace.payload === "none"
      ? "No model call. Zero characters were sent."
      : trace.payload === "original"
        ? `${trace.charactersSent} characters of the original were eligible because Gemini Nano was ready.`
        : `${trace.charactersSent} characters of already-redacted text were the cloud payload.`;
  const source = trace.inferenceSource.replace(/_/g, " ");
  return (
    <p className="text-sm text-muted-foreground">
      Firebase AI Logic mode <span className="font-mono">prefer_on_device</span>. {sent} Reported source: {source}.
    </p>
  );
}
