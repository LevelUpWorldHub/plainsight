import { resolveOverlaps } from "./overlap";
import { redact } from "./redact";
import {
  ENTITY_PLURALS,
  ENTITY_TYPES,
  REDACTION_TOKENS,
  type Directive,
  type EntityType,
  type Finding,
  type PrivacyRule,
} from "./types";

const PHRASES: { type: EntityType; pattern: RegExp }[] = [
  {
    type: "insurance_id",
    pattern:
      /^(?:insurance|member|subscriber|policy)\s+(?:ids?|numbers?|nos?\.?)$/i,
  },
  { type: "insurance_id", pattern: /^insurance$/i },
  {
    type: "ssn",
    pattern: /^(?:ssns?|social security(?:\s+numbers?)?)$/i,
  },
  { type: "phone", pattern: /^(?:phone\s+numbers?|phones?)$/i },
  { type: "email", pattern: /^(?:email\s+addresses?|e-mails?|emails?)$/i },
  {
    type: "dob",
    pattern: /^(?:dates?\s+of\s+birth|birth\s+dates?|birthdays?|dobs?)$/i,
  },
  { type: "mrn", pattern: /^(?:mrns?|medical\s+record\s+numbers?)$/i },
  {
    type: "address",
    pattern: /^(?:address(?:es)?|home\s+address(?:es)?|street\s+address(?:es)?)$/i,
  },
  { type: "diagnosis", pattern: /^(?:diagnoses|diagnosis|conditions?)$/i },
  {
    type: "medication",
    pattern: /^(?:medications?|meds|medicines?|prescriptions?)$/i,
  },
  {
    type: "name",
    pattern:
      /^(?:names?|patient\s+names?|my\s+(?:kid|child)(?:'s|’s)?\s+name)$/i,
  },
];

function matchEntityPhrase(body: string): EntityType | null {
  const cleaned = body.trim().replace(/^(?:my|the|all|any)\s+/i, "");
  for (const phrase of PHRASES) {
    if (phrase.pattern.test(cleaned) || phrase.pattern.test(body.trim())) {
      return phrase.type;
    }
  }
  return null;
}

function directivesForTarget(
  raw: string,
  mode: "keep" | "redact",
): Directive[] {
  const body = raw.trim().replace(/^["']|["']$/g, "");
  const kid = body.match(
    /^(?:my\s+)?(?:kid|child|son|daughter)(?:'s|’s)?\s+name(?:\s+is|\s*:)?(?:\s+([A-Za-z][A-Za-z.'-]*(?:\s+[A-Za-z][A-Za-z.'-]*){0,3}))?$/i,
  );
  if (kid) {
    const name = kid[1]?.trim();
    if (name) {
      return mode === "keep"
        ? [{ kind: "keep_type", entityType: "name" }]
        : [{ kind: "redact_literal", literal: name, entityType: "name" }];
    }
    return [
      mode === "keep"
        ? { kind: "keep_type", entityType: "name" }
        : { kind: "redact_type", entityType: "name" },
    ];
  }

  const possessive = body.match(
    /^(?:her|his|their|my|the)\s+(.+)$/i,
  );
  if (possessive?.[1]) {
    const owned = matchEntityPhrase(possessive[1]);
    if (owned) {
      return [
        mode === "keep"
          ? { kind: "keep_type", entityType: owned }
          : { kind: "redact_type", entityType: owned },
      ];
    }
  }

  const entityType = matchEntityPhrase(body);
  if (entityType) {
    return [
      mode === "keep"
        ? { kind: "keep_type", entityType }
        : { kind: "redact_type", entityType },
    ];
  }

  if (body.length >= 2 && !/^everything(?:\s+else)?$/i.test(body)) {
    return [{ kind: "redact_literal", literal: body, entityType: "name" }];
  }
  return [];
}

function parseClause(
  clause: string,
  inherited: "keep" | "redact",
): { directives: Directive[]; mode: "keep" | "redact" } {
  const normalized = clause.trim().replace(/[.]+$/g, "");
  if (/^(?:hide|redact)\s+everything\s+else$/i.test(normalized)) {
    return {
      directives: [{ kind: "redact_all_others" }],
      mode: "redact",
    };
  }

  const keep = normalized.match(/^(?:keep|allow|show)\s+(.+)$/i);
  if (keep?.[1]) {
    return {
      directives: directivesForTarget(keep[1], "keep"),
      mode: "keep",
    };
  }

  const redact = normalized.match(
    /^(?:never send|do not send|don't send|don’t send|always hide|always redact|redact|hide)\s+(.+)$/i,
  );
  if (redact?.[1]) {
    return {
      directives: directivesForTarget(redact[1], "redact"),
      mode: "redact",
    };
  }

  return {
    directives: directivesForTarget(normalized, inherited),
    mode: inherited,
  };
}

export function describeDirectives(directives: Directive[]): string {
  if (directives.length === 0) {
    return "No change. Try “never send my kid’s name Maya Chen” or “keep insurance IDs, hide everything else”.";
  }
  return directives
    .map((directive) => {
      if (directive.kind === "redact_literal" && directive.literal) {
        return `Always redact “${directive.literal}”.`;
      }
      if (directive.kind === "redact_type" && directive.entityType) {
        return `Always redact ${ENTITY_PLURALS[directive.entityType]}.`;
      }
      if (directive.kind === "keep_type" && directive.entityType) {
        return `Keep ${ENTITY_PLURALS[directive.entityType]} visible.`;
      }
      if (directive.kind === "redact_all_others") {
        return "Redact every other detected identifier.";
      }
      return "";
    })
    .filter(Boolean)
    .join(" ");
}

export function parseRule(plainText: string, now = new Date()): PrivacyRule {
  const pieces = plainText
    .split(/,|;|\band\b/i)
    .map((piece) => piece.trim())
    .filter(Boolean);
  let mode: "keep" | "redact" = "redact";
  const directives: Directive[] = [];
  for (const piece of pieces) {
    const parsed = parseClause(piece, mode);
    mode = parsed.mode;
    directives.push(...parsed.directives);
  }
  return {
    id: crypto.randomUUID(),
    plainText: plainText.trim(),
    createdAt: now.toISOString(),
    source: "heuristic",
    directives,
    interpretation: describeDirectives(directives),
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function applyRules(
  findings: Finding[],
  text: string,
  rules: PrivacyRule[],
): Finding[] {
  const keep = new Set<EntityType>();
  const force = new Set<EntityType>();
  const literals: { literal: string; entityType: EntityType }[] = [];

  for (const rule of rules) {
    for (const directive of rule.directives) {
      if (directive.kind === "keep_type" && directive.entityType) {
        keep.add(directive.entityType);
      }
      if (directive.kind === "redact_type" && directive.entityType) {
        force.add(directive.entityType);
      }
      if (directive.kind === "redact_literal" && directive.literal) {
        literals.push({
          literal: directive.literal,
          entityType: directive.entityType ?? "name",
        });
      }
    }
  }

  const next = findings.filter(
    (finding) => !keep.has(finding.type) || force.has(finding.type),
  );

  for (const { literal, entityType } of literals) {
    const re = new RegExp(escapeRegExp(literal), "gi");
    let match: RegExpExecArray | null;
    while ((match = re.exec(text))) {
      next.push({
        type: entityType,
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
        replacement: REDACTION_TOKENS[entityType],
        source: "rule",
        confidence: 1,
      });
      if (match[0].length === 0) re.lastIndex += 1;
    }
  }

  return resolveOverlaps(next);
}

export function redactWithRules(
  text: string,
  findings: Finding[],
  rules: PrivacyRule[],
): { findings: Finding[]; redacted: string } {
  const applied = applyRules(findings, text, rules);
  return { findings: applied, redacted: redact(text, applied) };
}

export function knownEntityTypes(): readonly EntityType[] {
  return ENTITY_TYPES;
}
