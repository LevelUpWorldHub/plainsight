export const ENTITY_TYPES = [
  "name",
  "dob",
  "mrn",
  "insurance_id",
  "address",
  "phone",
  "ssn",
  "email",
  "diagnosis",
  "medication",
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

export type FindingSource = "heuristic" | "rule" | "model";

export type InferencePath = "on_device" | "cloud" | "heuristic_only";

export interface Finding {
  type: EntityType;
  start: number;
  end: number;
  text: string;
  replacement: string;
  source: FindingSource;
  confidence: number;
}

export const ENTITY_LABELS: Record<EntityType, string> = {
  name: "Name",
  dob: "Date of birth",
  mrn: "MRN",
  insurance_id: "Insurance ID",
  address: "Address",
  phone: "Phone",
  ssn: "SSN",
  email: "Email",
  diagnosis: "Diagnosis",
  medication: "Medication",
};

export const ENTITY_PLURALS: Record<EntityType, string> = {
  name: "names",
  dob: "dates of birth",
  mrn: "medical record numbers",
  insurance_id: "insurance IDs",
  address: "addresses",
  phone: "phone numbers",
  ssn: "SSNs",
  email: "email addresses",
  diagnosis: "diagnoses",
  medication: "medications",
};

export const REDACTION_TOKENS: Record<EntityType, string> = {
  name: "[NAME]",
  dob: "[DATE OF BIRTH]",
  mrn: "[MRN]",
  insurance_id: "[INSURANCE ID]",
  address: "[ADDRESS]",
  phone: "[PHONE]",
  ssn: "[SSN]",
  email: "[EMAIL]",
  diagnosis: "[DIAGNOSIS]",
  medication: "[MEDICATION]",
};

export type DirectiveKind =
  | "redact_literal"
  | "redact_type"
  | "keep_type"
  | "redact_all_others";

export interface Directive {
  kind: DirectiveKind;
  literal?: string;
  entityType?: EntityType;
}

export interface PrivacyRule {
  id: string;
  plainText: string;
  createdAt: string;
  source: "heuristic" | "on_device_model";
  directives: Directive[];
  interpretation: string;
}

export interface HybridPrompt {
  mode: "prefer_on_device";
  path: "on_device" | "cloud";
  documentText: string;
  prompt: string;
}

export interface ScanTrace {
  mode: "prefer_on_device";
  payload: "none" | "original" | "redacted";
  inferenceSource: "on_device" | "in_cloud" | "unknown" | "not_called";
  charactersSent: number;
}

export interface ScanResult {
  original: string;
  redacted: string;
  findings: Finding[];
  path: InferencePath;
  detail: string;
  /** Exact text a cloud call would send. Null when no cloud call is offered. */
  cloudOffer: string | null;
  trace: ScanTrace;
}

export interface LedgerEntry {
  id: string;
  timestamp: string;
  destination: string;
  redactionCounts: Partial<Record<EntityType, number>>;
  totalRedactions: number;
  path: InferencePath;
  redactedPreview: string;
  kind: "text" | "image";
}

export const DESTINATIONS = [
  "ChatGPT",
  "Gemini",
  "Claude",
  "Clinic web form",
  "Other",
] as const;

export type Destination = (typeof DESTINATIONS)[number];

export function isEntityType(value: string): value is EntityType {
  return (ENTITY_TYPES as readonly string[]).includes(value);
}
