import { Badge } from "@/components/ui/badge";
import { ENTITY_LABELS, type EntityType, type Finding } from "@/lib/phi/types";
import { countByType } from "@/lib/phi/redact";

export function FindingSummary({ findings }: { findings: Finding[] }) {
  const counts = countByType(findings);
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
      {entries.map(([type, count]) => (
        <Badge key={type} variant="secondary">
          {count} {ENTITY_LABELS[type].toLowerCase()}
        </Badge>
      ))}
    </div>
  );
}
