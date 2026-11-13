import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { detectHeuristic } from "./detect";
import { countByType, redact } from "./redact";

function sample(name: string): string {
  return readFileSync(new URL(`../../../samples/${name}`, import.meta.url), "utf8");
}

function typesIn(text: string): string[] {
  return detectHeuristic(text).map((finding) => finding.type);
}

describe("heuristic detector", () => {
  it("redacts a fictional clinic bill and leaves the service date and balance", () => {
    const text = sample("medical-bill.txt");
    const findings = detectHeuristic(text);
    const redacted = redact(text, findings);

    expect(redacted).not.toContain("Mara Ellison");
    expect(redacted).not.toContain("03/14/1986");
    expect(redacted).not.toContain("00482193");
    expect(redacted).not.toContain("XTR-4491208");
    expect(redacted).not.toContain("88G-2291");
    expect(redacted).not.toContain("453-22-1890");
    expect(redacted).not.toContain("1842 Valencia Street");
    expect(redacted).not.toContain("mara.ellison@example.com");
    expect(redacted).not.toContain("(415) 555-0148");
    expect(redacted).not.toContain("Helen Cho");
    expect(redacted).not.toContain("Metformin");
    expect(redacted).not.toContain("Lisinopril");
    expect(redacted).not.toContain("E11.9");
    expect(redacted).not.toContain("I10.0");
    expect(redacted).toContain("11/02/2026");
    expect(redacted).toContain("$186.40");
    expect(redacted).toContain("VALLEY PAPER CLINIC");
    expect(redacted).toContain("[SSN]");
    expect(redacted).toContain("[INSURANCE ID]");
    expect(countByType(findings).ssn).toBe(1);
  });

  it("does not treat a service date or a claim number as a birth date or member id", () => {
    const text = sample("eob.txt");
    const redacted = redact(text, detectHeuristic(text));
    expect(redacted).not.toContain("Jonah Hale");
    expect(redacted).not.toContain("NM-2201846");
    expect(redacted).not.toContain("07/22/1979");
    expect(redacted).not.toContain("J45.909");
    expect(redacted).not.toContain("90 Birch Lane");
    expect(redacted).toContain("09/15/2026");
    expect(redacted).toContain("CLM-100293");
    expect(redacted).toContain("Northwind Mutual");
    expect(redacted).toContain("$40.00");
  });

  it("redacts a lab report without hiding the glucose value", () => {
    const text = sample("lab-result.txt");
    const redacted = redact(text, detectHeuristic(text));
    expect(redacted).not.toContain("Priya Raman");
    expect(redacted).not.toContain("A449218");
    expect(redacted).not.toContain("503-555-0199");
    expect(redacted).not.toContain("priya.raman@example.com");
    expect(redacted).toContain("Glucose 142 mg/dL");
    expect(redacted).toContain("10/30/2026");
  });

  it("redacts an intake form, including the emergency contact", () => {
    const text = sample("intake-form.txt");
    const redacted = redact(text, detectHeuristic(text));
    expect(redacted).not.toContain("Elena Vasquez");
    expect(redacted).not.toContain("Luis Vasquez");
    expect(redacted).not.toContain("521-44-9088");
    expect(redacted).not.toContain("BLU-8832104");
    expect(redacted).not.toContain("14 Cedar Court");
    expect(redacted).toContain("follow-up");
  });

  it("leaves a name written in a sentence until a rule catches it", () => {
    const text = sample("caregiver-note.txt");
    const redacted = redact(text, detectHeuristic(text));
    expect(redacted).toContain("Maya Chen");
    expect(redacted).not.toContain("Elena Vasquez");
    expect(redacted).not.toContain("Luis Vasquez");
    expect(redacted).not.toContain("Sertraline");
    expect(redacted).toContain("11/18/2026");
  });

  it("flags each requested identifier class", () => {
    const text = [
      "Patient: Ada Lovelace",
      "DOB: April 2, 2016",
      "MRN: ZZ-10293",
      "Member ID: QWE12345",
      "Home Address: 10 Oak Street, Austin, TX 78701",
      "Phone: (512) 555-0100",
      "SSN: 111-22-3333",
      "Email: ada@example.com",
      "Diagnosis: Asthma",
      "Medications: Albuterol 2 mg",
    ].join("\n");
    const found = new Set(typesIn(text));
    expect(found).toEqual(
      new Set([
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
      ]),
    );
  });
});
