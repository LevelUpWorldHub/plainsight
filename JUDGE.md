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
