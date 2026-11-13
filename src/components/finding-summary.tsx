import { Badge } from "@/components/ui/badge";
import { ENTITY_LABELS, type EntityType, type Finding } from "@/lib/phi/types";
import { charactersHeld, countByType } from "@/lib/phi/redact";

export function FindingSummary({
  findings,
  originalLength,
}: {
  findings: Finding[];
  originalLength?: number;
}) {
  const counts = countByType(findings);
  const held = charactersHeld(findings);
  const percent =
    originalLength && originalLength > 0 ? Math.round((held / originalLength) * 100) : null;
  const entries = Object.entries(counts) as [EntityType, number][];
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No personal or medical identifiers were marked. Read the outbox anyway before you approve it.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-2" aria-label="Redaction counts">
      <Badge variant="outline">{findings.length} redactions</Badge>
      {percent !== null ? (
        <Badge variant="outline">
          {held} characters held ({percent}%)
        </Badge>
      ) : null}
      {entries.map(([type, count]) => (
        <Badge key={type} variant="secondary">
          {count} {ENTITY_LABELS[type].toLowerCase()}
        </Badge>
      ))}
    </div>
  );
}
