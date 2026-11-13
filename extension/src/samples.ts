import bill from "../../samples/medical-bill.txt?raw";
import eob from "../../samples/eob.txt?raw";
import lab from "../../samples/lab-result.txt?raw";
import intake from "../../samples/intake-form.txt?raw";
import note from "../../samples/caregiver-note.txt?raw";

export const EXTENSION_SAMPLES = [
  { title: "Clinic bill", text: bill },
  { title: "EOB", text: eob },
  { title: "Lab result", text: lab },
  { title: "Intake form", text: intake },
  { title: "Caregiver note", text: note },
];
