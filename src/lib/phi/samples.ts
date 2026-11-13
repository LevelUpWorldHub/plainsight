export interface SampleDocument {
  id: string;
  title: string;
  file: string;
  blurb: string;
}

export const SAMPLE_DOCUMENTS: SampleDocument[] = [
  {
    id: "medical-bill",
    title: "Clinic bill",
    file: "medical-bill.txt",
    blurb: "A fictional statement with a patient, member ID, and medications.",
  },
  {
    id: "eob",
    title: "Explanation of benefits",
    file: "eob.txt",
    blurb: "A fictional EOB. The service date is not a birth date.",
  },
  {
    id: "lab-result",
    title: "Lab result",
    file: "lab-result.txt",
    blurb: "A fictional glucose panel tied to a medical record number.",
  },
  {
    id: "intake-form",
    title: "Intake form",
    file: "intake-form.txt",
    blurb: "A fictional front-desk form with an emergency contact.",
  },
  {
    id: "caregiver-note",
    title: "Caregiver note",
    file: "caregiver-note.txt",
    blurb: "A name written in a sentence, so a plain-English rule can catch it.",
  },
];

export async function fetchSample(file: string): Promise<string> {
  const response = await fetch(`/samples/${file}`);
  if (!response.ok) {
    throw new Error(`Could not load the sample ${file}.`);
  }
  return response.text();
}
