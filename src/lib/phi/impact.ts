import { detectHeuristic } from "./detect";
import { charactersHeld, countByType } from "./redact";
import { ENTITY_TYPES, type EntityType } from "./types";

export interface DocumentImpact {
  redactions: number;
  charactersHeld: number;
  characters: number;
  byType: Partial<Record<EntityType, number>>;
}

export function measureDocument(text: string): DocumentImpact {
  const findings = detectHeuristic(text);
  return {
    redactions: findings.length,
    charactersHeld: charactersHeld(findings),
    characters: text.length,
    byType: countByType(findings),
  };
}

export function sumImpact(parts: DocumentImpact[]): DocumentImpact {
  const byType: Partial<Record<EntityType, number>> = {};
  for (const type of ENTITY_TYPES) byType[type] = 0;
  let redactions = 0;
  let held = 0;
  let characters = 0;
  for (const part of parts) {
    redactions += part.redactions;
    held += part.charactersHeld;
    characters += part.characters;
    for (const type of ENTITY_TYPES) {
      byType[type] = (byType[type] ?? 0) + (part.byType[type] ?? 0);
    }
  }
  return { redactions, charactersHeld: held, characters, byType };
}

export function heldPercent(impact: DocumentImpact): number {
  if (impact.characters === 0) return 0;
  return Math.round((impact.charactersHeld / impact.characters) * 100);
}
