const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const EXTENDED_ARABIC_INDIC = "۰۱۲۳۴۵۶۷۸۹";

const LOOKALIKE_LETTERS: Record<string, string> = {
  А: "A",
  В: "B",
  Е: "E",
  К: "K",
  М: "M",
  Н: "H",
  О: "O",
  Р: "P",
  С: "C",
  Т: "T",
  Х: "X",
  а: "a",
  е: "e",
  о: "o",
  р: "p",
  с: "c",
  у: "y",
  х: "x",
  і: "i",
};

const DIGIT_FOLD: Record<string, string> = {};
for (const alphabet of [ARABIC_INDIC, EXTENDED_ARABIC_INDIC]) {
  [...alphabet].forEach((character, index) => {
    DIGIT_FOLD[character] = String(index);
  });
}

export function normalizeForScan(input: string): string {
  const folded = input.normalize("NFKC").replace(/[\u200B-\u200D\uFEFF\u2060]/g, "");
  let output = "";
  for (const character of folded) {
    output += DIGIT_FOLD[character] ?? LOOKALIKE_LETTERS[character] ?? character;
  }
  return output;
}
