import { ENTITY_LABELS, type Finding } from "@/lib/phi/types";

const TOKEN = /\[(?:NAME|DATE OF BIRTH|MRN|INSURANCE ID|ADDRESS|PHONE|SSN|EMAIL|DIAGNOSIS|MEDICATION)\]/g;

function originalSegments(text: string, findings: Finding[]) {
  const sorted = [...findings].sort((a, b) => a.start - b.start);
  const segments: { text: string; finding?: Finding }[] = [];
  let cursor = 0;
  for (const finding of sorted) {
    if (finding.start < cursor) continue;
    if (finding.start > cursor) {
      segments.push({ text: text.slice(cursor, finding.start) });
    }
    segments.push({ text: text.slice(finding.start, finding.end), finding });
    cursor = finding.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}

export function DiffView({
  original,
  redacted,
  findings,
}: {
  original: string;
  redacted: string;
  findings: Finding[];
}) {
  const segments = originalSegments(original, findings);
  const redactedParts = redacted.split(TOKEN);
  const tokens = redacted.match(TOKEN) ?? [];

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <article className="paper-panel min-w-0 rounded-xl p-4" aria-label="Original, held on this device">
        <header className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-heading text-lg">Held on this device</h2>
          <span className="stamp text-muted-foreground">Original</span>
        </header>
        <p className="font-mono text-sm leading-6 whitespace-pre-wrap break-words">
          {segments.map((segment, index) =>
            segment.finding ? (
              <mark
                key={`${segment.finding.start}-${index}`}
                className="phi-mark"
                title={ENTITY_LABELS[segment.finding.type]}
              >
                {segment.text}
              </mark>
            ) : (
              <span key={`plain-${index}`}>{segment.text}</span>
            ),
          )}
        </p>
      </article>
      <article className="paper-panel min-w-0 rounded-xl p-4" aria-label="Redacted text that can leave">
        <header className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-heading text-lg">Will leave the device</h2>
          <span className="stamp text-primary">Outbox</span>
        </header>
        <p className="font-mono text-sm leading-6 whitespace-pre-wrap break-words">
          {redactedParts.map((part, index) => (
            <span key={`redacted-${index}`}>
              {part}
              {tokens[index] ? <mark className="token-mark">{tokens[index]}</mark> : null}
            </span>
          ))}
        </p>
      </article>
    </div>
  );
}
