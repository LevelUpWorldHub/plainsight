# PlainSight judge log

Strict #BuildHybridAI scoring. Each criterion is 1–10. A 9.5 is a demo a judge can run, defend against Rescriber, Private Guard, and Google’s sensitive-data-validator sample, and still find only small nits.

Rivals, as judged here:

- **Rescriber** redacts clinical text before an AI scribe, mostly with patterns, and does not make the user approve the exact outbound string.
- **Private Guard** warns or blocks a sensitive paste. It does not show a side-by-side outbox or keep a local ledger of what was approved.
- **Google’s sensitive-data-validator demo** classifies a string with Gemini. It does not redact, does not wait for approval, and does not record what left the device.

Opening commit: `8fad9cf`.

## Round 1 — Core correctness

Opening scores: **Tech 6.6 · Design 7.1 · Impact 6.2 · Idea 7.5**

The detector and the cloud-payload guard are real, and 24 tests already locked the fictional samples. A strict pass still found mistakes a front desk would notice.

Top 5 gaps:

1. A three-part name (`Mary Anne Smith`, `Mara J. Ellison`) was clipped or, after a naive fix, swallowed the next word (`Balance`).
2. Any street address was redacted, including a clinic’s public letterhead that was not the patient’s home.
3. `inferenceSource: unknown` was treated as Gemini Nano, so a failed source report could wear the on-device badge.
4. `addresses?` in the rule parser matches “addresse,” not “address,” so “and her address” became a literal name redaction.
5. An SSN written `453 22 1890` was untested; labeled spaced SSNs needed a regression test next to the name and letterhead cases.

Fixes: name tokens stop at field labels and at words like Balance; a letterhead street is kept unless the same address is also the patient’s; unknown inference sources discard model findings; singular “address” parses as the address type. Tests went from 24 to 30.

Re-score: **Tech 7.2 · Design 7.1 · Impact 6.2 · Idea 7.5**

Gain: tech +0.6. Design, impact, and idea unchanged. The hybrid call is still a thin wrapper, and the product still does not show a judge the exact payload decision.

## Round 2 — Firebase AI Logic hybrid depth

Opening scores: **Tech 7.2 · Design 7.1 · Impact 6.2 · Idea 7.5**

Top 5 gaps:

1. The UI never said how many characters were eligible for a model, or whether that payload was the original or the redacted text.
2. An unknown `inferenceSource` discarded findings but did not admit that the original had already been handed to the model.
3. Cloud Gemini was not constrained to the findings JSON schema, so a chatty answer could miss the parser.
4. The on-device session used Chrome’s default, which includes image input. PlainSight’s text scan should ask for English text only.
5. Nano download progress was swallowed, and the cloud path still called `initializeDeviceModel`, which can start a download the user did not ask for.

Fixes: every scan now carries a `trace` (`prefer_on_device`, payload kind, characters, reported source). Cloud `inCloudParams` set `responseMimeType: application/json` plus a findings schema. On-device `expectedInputs` / `expectedOutputs` are English text, with a JSON `responseConstraint`. Download progress is reported only on the on-device path. The prompt tells the model the document is untrusted data. Rule interpretation accepts model output only when `inferenceSource` is `on_device`.

Re-score: **Tech 8.0 · Design 7.3 · Impact 6.2 · Idea 7.7**

Gain: tech +0.8, design +0.2, idea +0.2. Impact unchanged. The trace is visible, but the outbox still does not lead with how much was held back, and `docs/screenshots/extension.png` is still missing. Live Nano and App Check still need Mark’s Firebase project.

## Round 3 — Design and UX

Opening scores: **Tech 8.0 · Design 7.3 · Impact 6.2 · Idea 7.7**

Top 5 gaps:

1. `docs/screenshots/extension.png` was missing, so the extension claim had no picture.
2. The outbox did not say how many characters were held back.
3. The two columns had no legend, so a first-time judge had to infer yellow marks versus black tokens.
4. Nano download progress was rendered only after the scan finished, which is when it no longer matters.
5. Shooting the side panel exposed a detector bug: `Dr. Helen Cho` crossed a newline and ate the word “Date” from “Date of service.”

Fixes: character-held badge with a percent of the document, column legends, progress copy while the scan is running, side-panel focus rings, and `extension.png` from the built panel. Honorific names no longer cross lines. The service date line stays intact.

Re-score: **Tech 8.3 · Design 8.1 · Impact 6.6 · Idea 7.7**

Gain: tech +0.3, design +0.8, impact +0.4. The percent is the first number a judge sees that comes from the document in front of them. The panel is still visually quieter than the web app, and there is no guided path through the demo.

## Round 4 — Robustness

Opening scores: **Tech 8.3 · Design 8.1 · Impact 6.6 · Idea 7.7**

Top 5 gaps:

1. A multi-megabyte paste could hang the regex detector on the main thread with no limit.
2. Offline was indistinguishable from “Firebase is missing,” so a judge on a plane would think the product was broken.
3. Empty input was only guarded in the button, not in `runScan`.
4. A model that replied in prose, including a repeated SSN, had no regression test. The parser might have been trusted too quickly.
5. Download and ledger failures were messaged, but the size limit and the prose-model case were not locked in CI.

Fixes: scans over 200,000 characters throw `DocumentTooLargeError` before detection. An offline banner states that the detector, rules, and ledger still run. Tests cover an empty document, the size cap, and a prose model reply that tries to repeat an SSN. That reply does not reintroduce the number.

Re-score: **Tech 8.6 · Design 8.2 · Impact 6.6 · Idea 7.7**

Gain: tech +0.3, design +0.1. Impact and idea unchanged. The product still waits for the user to know the demo order.

## Round 5 — Demo wow moment

Opening scores: **Tech 8.6 · Design 8.2 · Impact 6.6 · Idea 7.7**

Top 5 gaps:

1. A judge had to know the script: load the bill, scan, then separately discover Maya Chen.
2. The counts existed only as chips, not as a sentence tied to the action just taken.
3. The caregiver-note miss, which is the point of plain-English rules, was easy to skip.
4. Firebase was in the outbox’s initial import, so the first click paid for a library the demo does not use.
5. There was no on-screen cue a recording could cut to.

Fixes: “Run the front-desk demo” loads the fictional clinic bill, scans it, and states the live span count and characters held. “Step 2” loads the caregiver note and says whether Maya Chen is still in the outbox. The Firebase runner is imported only if a project is configured.

Re-score: **Tech 8.7 · Design 8.6 · Impact 7.1 · Idea 8.1**

Gain: tech +0.1, design +0.4, impact +0.5, idea +0.4. The demo now tells the story with numbers from the scan. It is not yet a measured page, and Lighthouse has not been run.

## Round 6 — Accessibility and performance

Opening scores: **Tech 8.7 · Design 8.6 · Impact 7.1 · Idea 8.1**

Top 5 gaps:

1. Lighthouse had never been run, so the 90+ bar was a hope.
2. No skip link.
3. Muted text was lighter than it needed to be on the paper background.
4. Firebase was still statically imported on the rules and screenshot routes.
5. The production bundle, not the dev server, is what a judge’s Lighthouse run would hit.

Fixes: skip link to `#content`, darker muted text, Firebase loaded only when a project is configured. Production Lighthouse on `http://127.0.0.1:4321/` (mobile, Next.js start): **performance 98, accessibility 100, best practices 100, SEO 100**.

Re-score: **Tech 9.1 · Design 9.0 · Impact 7.1 · Idea 8.1**

Gain: tech +0.4, design +0.4. Impact and idea unchanged. The scores are measured, not estimated. Security headers and a hostile-input pass are still open, and impact is still a sentence on the outbox rather than a page of totals.
