# Devpost draft

Do not submit this. Fields below are a draft for the #BuildHybridAI form. Replace the screenshot slots before publishing, and do not paste Firebase keys into the form.

## Title

PlainSight

## Tagline

See the exact medical text that will leave your device, then approve it.

## Inspiration

Patients, caregivers, and front-desk staff paste bills, EOBs, lab results, and intake forms into AI chatbots to decode them. Those documents are full of names, dates of birth, medical record numbers, member IDs, addresses, diagnoses, and medications. The person sending them rarely gets a precise view of what left, and they have no local record afterward.

Existing guards tend to block a site outright or label a string as sensitive. Neither shows the sender the redacted payload, lets them write an exception in a sentence (“keep the insurance ID”), nor keeps a device-local ledger of what they approved. We wanted that pause, in the browser, before the send button.

## What it does

PlainSight is a privacy layer in front of the chatbot.

- It detects personal and medical information on the device and shows an outbox: the original beside the exact text that would be sent, with every redaction marked.
- The user approves before anything is copied or logged.
- A local IndexedDB ledger stores the destination, time, redaction counts, and the redacted preview. It exports and clears. It does not store the original.
- Rules are plain English. “never send my kid's name Maya Chen” and “keep insurance IDs, hide everything else” become structured checks.
- Screenshots are read with on-device OCR and returned as a redacted image. The image is not uploaded.
- A Chrome extension adds the same outbox to ChatGPT, Gemini, Claude, and ordinary text fields.
- The web app is a responsive PWA for phones. A native Android app is documented, not shipped: it needs Play Integrity, AICore, and a Firebase Android app.

A built-in detector keeps the demo working when Gemini Nano is unavailable. Fictional paperwork lives in `samples/`.

## How we built it

The web app is Next.js, TypeScript, and Tailwind, with shadcn/ui for controls. The detector, rule parser, and cloud-payload guard are plain TypeScript with unit tests. The ledger is IndexedDB. Screenshots use Tesseract.js and a canvas. The extension is Manifest V3: a side panel plus a content script.

Model calls go through the Firebase JS SDK, `firebase/ai`, with `getGenerativeModel(ai, { mode: InferenceMode.PREFER_ON_DEVICE })`. App Check is initialized with reCAPTCHA Enterprise before AI Logic is used. When Chrome 139+ reports Gemini Nano as available, the on-device model may see the original, and the UI reads `inferenceSource` so the badge says where the call ran. When Nano is not ready, PlainSight does not call the cloud automatically. The user can send the already-redacted text, and the client refuses a cloud prompt that still contains the raw document.

## Challenges we ran into

Hybrid mode can fall back to the cloud while a model is still downloading. A privacy product cannot treat that fallback as “on device.” We gate the payload: the original is eligible only when the on-device model is already available, and a surprise `in_cloud` result discards the model’s suggestions.

The cloud is then a weak detector by design. It can only comment on leftovers that are still in the redacted text, which means a miss by the local detector can still be inside that opt-in request. We show that exact string before the call instead of hiding the tradeoff.

Names in running prose are a different problem from “Patient: Mara Ellison.” The heuristic is honest about that miss. The plain-English rule is the feature that closes it, and that rule is not sent to the cloud because the sentence may contain the name.

Chrome extension composers are contenteditable and easy to desync from React state. Replacing the field is best-effort; the outbox approval still stands if the site ignores the write.

## Accomplishments that we're proud of

The outbox makes the privacy decision visible. The ledger is a record the user can export without giving us an account. The same detector and the same cloud guard run in the web app and the extension. The tests fail if a cloud prompt still contains the raw sample bill.

## What we learned

On-device inference is not a flag you set and forget. Availability, download time, and the fallback path are part of the product, and the UI has to say which one happened. For medical text, a deterministic pass in front of the model is what makes the demo safe when the model is missing, and what makes the cloud path even discussable.

## What's next

- Ship the Android app on Firebase AI Logic hybrid mode with Play Integrity, using the same “cloud sees redacted text only” rule.
- Share rules between the extension and the PWA without a server, for example a file export.
- Widen the on-device name pass once Gemini Nano is consistently available, and keep the heuristic as the floor.
- Let a clinic map “destination” to the specific scribe or portal the front desk uses.

## Built with

Next.js, TypeScript, Tailwind CSS, shadcn/ui, Firebase AI Logic, Firebase App Check, Gemini Nano, Chrome Extensions (Manifest V3), Tesseract.js, IndexedDB

## Hackathon

#BuildHybridAI
