import { resolveOverlaps } from "./overlap";
import { REDACTION_TOKENS, type EntityType, type Finding } from "./types";

const MEDICATIONS = [
  "insulin glargine",
  "hydrochlorothiazide",
  "levothyroxine",
  "empagliflozin",
  "semaglutide",
  "atorvastatin",
  "rosuvastatin",
  "simvastatin",
  "azithromycin",
  "amoxicillin",
  "acetaminophen",
  "montelukast",
  "fluticasone",
  "escitalopram",
  "venlafaxine",
  "aripiprazole",
  "spironolactone",
  "clopidogrel",
  "pantoprazole",
  "hydrocodone",
  "oxycodone",
  "alprazolam",
  "quetiapine",
  "adalimumab",
  "duloxetine",
  "gabapentin",
  "sertraline",
  "fluoxetine",
  "omeprazole",
  "amlodipine",
  "lisinopril",
  "metformin",
  "albuterol",
  "bupropion",
  "trazodone",
  "lorazepam",
  "tramadol",
  "metoprolol",
  "carvedilol",
  "furosemide",
  "prednisone",
  "ibuprofen",
  "apixaban",
  "warfarin",
  "losartan",
  "aspirin",
  "insulin",
].sort((a, b) => b.length - a.length);

const DIAGNOSES = [
  "type 2 diabetes mellitus",
  "major depressive disorder",
  "generalized anxiety disorder",
  "congestive heart failure",
  "coronary artery disease",
  "chronic kidney disease",
  "essential hypertension",
  "type 1 diabetes",
  "type 2 diabetes",
  "atrial fibrillation",
  "hyperlipidemia",
  "hypothyroidism",
  "osteoarthritis",
  "hypertension",
  "migraine",
  "asthma",
  "anemia",
  "copd",
].sort((a, b) => b.length - a.length);

const MONTH =
  "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function addFinding(
  findings: Finding[],
  type: EntityType,
  text: string,
  start: number,
  confidence: number,
): void {
  if (!text || start < 0) return;
  findings.push({
    type,
    start,
    end: start + text.length,
    text,
    replacement: REDACTION_TOKENS[type],
    source: "heuristic",
    confidence,
  });
}

function scanLabeled(
  text: string,
  label: RegExp,
  type: EntityType,
  take: (rest: string) => string | null,
  confidence: number,
  findings: Finding[],
): void {
  const flags = label.flags.includes("g") ? label.flags : `${label.flags}g`;
  const re = new RegExp(label.source, flags);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const start = match.index + match[0].length;
    const value = take(text.slice(start));
    if (value) addFinding(findings, type, value, start, confidence);
    if (match[0].length === 0) re.lastIndex += 1;
  }
}

function takePattern(rest: string, pattern: RegExp): string | null {
  const match = pattern.exec(rest);
  return match?.[1] ?? null;
}

const NAME_STOP = new Set([
  "dob",
  "mrn",
  "ssn",
  "phone",
  "email",
  "member",
  "group",
  "home",
  "date",
  "diagnosis",
  "medications",
  "medication",
  "address",
  "physician",
  "patient",
  "amount",
  "secondary",
  "balance",
  "due",
  "total",
  "statement",
  "paid",
  "account",
]);

function isNameStop(part: string): boolean {
  return NAME_STOP.has(part.replace(/[.]/g, "").toLowerCase());
}

function isInitial(part: string): boolean {
  return /^[A-Z]\.?$/.test(part);
}

function takePersonName(rest: string): string | null {
  const match = rest.match(/^([A-Z][A-Za-z.'’-]+(?:[ \t]+[A-Z][A-Za-z.'’-]+){1,3})/);
  if (!match?.[1]) return null;
  const parts: string[] = [];
  for (const part of match[1].split(/[ \t]+/)) {
    if (isNameStop(part)) break;
    parts.push(part);
  }
  const honorific = /^(?:Dr|Mr|Mrs|Ms)\.?$/.test(parts[0] ?? "");
  let limit = honorific ? 4 : 2;
  if (!honorific && parts[1] && isInitial(parts[1]) && parts[2]) limit = 3;
  else if (!honorific && parts[2] && /^[A-Z][a-z.'’-]+$/.test(parts[2])) limit = 3;
  const kept = parts.slice(0, limit);
  if (kept.length < 2) return null;
  return kept.join(" ");
}

function normalizeAddress(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function dropPublicLetterhead(text: string, findings: Finding[]): Finding[] {
  const patientAt = text.search(/\b(?:PATIENT\b|Patient\b|Member\b|Subscriber\b)/);
  if (patientAt < 0) return findings;
  const patientAddresses = new Set(
    findings
      .filter((finding) => finding.type === "address" && finding.start >= patientAt)
      .map((finding) => normalizeAddress(finding.text)),
  );
  return findings.filter((finding) => {
    if (finding.type !== "address" || finding.start >= patientAt) return true;
    return patientAddresses.has(normalizeAddress(finding.text));
  });
}

function takeLine(rest: string, accept: (line: string) => boolean): string | null {
  const line = (rest.split("\n")[0] ?? "").trim();
  if (!line || !accept(line)) return null;
  return line;
}

function scanGlobal(
  text: string,
  pattern: RegExp,
  type: EntityType,
  confidence: number,
  findings: Finding[],
): void {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const re = new RegExp(pattern.source, flags);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const value = match[1] ?? match[0];
    const offset = match[0].indexOf(value);
    if (offset >= 0 && value) {
      addFinding(findings, type, value, match.index + offset, confidence);
    }
    if (match[0].length === 0) re.lastIndex += 1;
  }
}

export function detectHeuristic(text: string): Finding[] {
  const findings: Finding[] = [];

  scanGlobal(text, /\b\d{3}-\d{2}-\d{4}\b/g, "ssn", 0.98, findings);
  scanLabeled(
    text,
    /\bSSN\b\s*[:#-]?\s*/gi,
    "ssn",
    (rest) => takePattern(rest, /^(\d{3}[-\s]?\d{2}[-\s]?\d{4})/),
    0.98,
    findings,
  );

  scanGlobal(
    text,
    /(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]\d{3}[\s.-]\d{4}\b/g,
    "phone",
    0.95,
    findings,
  );

  scanGlobal(
    text,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    "email",
    0.97,
    findings,
  );

  scanLabeled(
    text,
    new RegExp(
      `\\b(?:DOB|D\\.O\\.B\\.|Date of Birth|Birth Date|Birthdate|Born)\\b\\s*[:#-]?\\s*`,
      "gi",
    ),
    "dob",
    (rest) =>
      takePattern(
        rest,
        new RegExp(
          `^(\\d{1,2}[/\\-]\\d{1,2}[/\\-]\\d{2,4}|(?:${MONTH})\\s+\\d{1,2},?\\s+\\d{4})`,
          "i",
        ),
      ),
    0.96,
    findings,
  );

  scanLabeled(
    text,
    /\b(?:MRN|Medical Record(?:\s+(?:Number|No\.?|#))?)\b\s*[:#-]?\s*/gi,
    "mrn",
    (rest) => {
      const value = takePattern(rest, /^([A-Za-z0-9][A-Za-z0-9-]{3,24})/);
      return value && /\d/.test(value) ? value : null;
    },
    0.93,
    findings,
  );

  scanLabeled(
    text,
    /\b(?:Member|Subscriber|Policy|Group|Insurance|Medicare|Medicaid)\s*(?:ID|Number|No\.?|#)?\b\s*[:#-]?\s*/gi,
    "insurance_id",
    (rest) => {
      const value = takePattern(rest, /^([A-Za-z0-9][A-Za-z0-9-]{4,24})/);
      return value && /\d/.test(value) ? value : null;
    },
    0.9,
    findings,
  );

  scanLabeled(
    text,
    /\b(?:Home\s+Address|Street\s+Address|Mailing\s+Address|Address|Residence)\b\s*[:#-]\s*/gi,
    "address",
    (rest) => takeLine(rest, (line) => line.length >= 8 && /\d/.test(line)),
    0.9,
    findings,
  );

  scanGlobal(
    text,
    /\b\d{1,6}\s+[A-Z][A-Za-z0-9.'-]*(?:\s+[A-Z][A-Za-z0-9.'-]*){0,4}\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl|Terrace|Ter)\.?(?:,\s*[A-Za-z]+(?:\s+[A-Za-z]+)*)?(?:,\s*[A-Z]{2})?(?:\s+\d{5}(?:-\d{4})?)?/g,
    "address",
    0.84,
    findings,
  );

  scanLabeled(
    text,
    /\b(?:Patient(?:\s+Name)?|Member\s+Name|Subscriber(?:\s+Name)?|Guarantor|Insured|Physician|Doctor|Caregiver|Parent|Mother|Father|Child|Dependent|Emergency\s+Contact|Account(?:\s+for)?)\b\s*[:#-]\s*/gi,
    "name",
    takePersonName,
    0.88,
    findings,
  );

  scanGlobal(
    text,
    /\b(?:Mr|Mrs|Ms|Dr)\.?(?:[ \t]+[A-Z][A-Za-z.'’-]+){1,3}\b/g,
    "name",
    0.8,
    findings,
  );

  scanLabeled(
    text,
    /\b(?:Diagnosis|Dx|Assessment|Impression)\b\s*[:#-]\s*/gi,
    "diagnosis",
    (rest) => takeLine(rest, (line) => line.length >= 3),
    0.9,
    findings,
  );

  scanGlobal(
    text,
    new RegExp(`\\b(?:${DIAGNOSES.map(escapeRegExp).join("|")})\\b`, "gi"),
    "diagnosis",
    0.8,
    findings,
  );

  scanGlobal(text, /\b[A-TV-Z]\d{2}\.\d{1,4}\b/g, "diagnosis", 0.86, findings);

  scanLabeled(
    text,
    /\b(?:Medications?|Prescriptions?|Rx)\b\s*[:#-]\s*/gi,
    "medication",
    (rest) => takeLine(rest, (line) => line.length >= 3),
    0.9,
    findings,
  );

  scanGlobal(
    text,
    new RegExp(
      `\\b(?:${MEDICATIONS.map(escapeRegExp).join("|")})\\b(?:\\s+\\d+(?:\\.\\d+)?\\s*(?:mg|mcg|g|ml|units))?`,
      "gi",
    ),
    "medication",
    0.86,
    findings,
  );

  return resolveOverlaps(dropPublicLetterhead(text, findings));
}
