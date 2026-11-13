# PlainSight demo script

Three minutes. Record the web app at 1440×900 and the extension in a second window. Use only the fictional files in `samples/`. Have the ledger empty at the start, and do not have the Maya Chen rule saved yet.

If Firebase is configured and Gemini Nano is already downloaded, the first scan badge can say **On-device · Gemini Nano**. If it is not, the badge **On-device heuristic** is the honest shot. Do not pretend a cloud call was on-device.

## Shot list

| Time | Shot | On screen | Say |
| --- | --- | --- | --- |
| 0:00–0:12 | Wide, then the outbox empty state | PlainSight wordmark, the three steps | “People paste clinic bills into chatbots. The bill has a name, a record number, a member ID, and a medication. They never see the exact text that leaves.” |
| 0:12–0:28 | Click **Clinic bill**, then **Scan on this device** | The fictional statement, then the path badge | “PlainSight reads it on this device before anything is sent. This pass is the local detector.” |
| 0:28–0:55 | Slow pan across the two columns | Yellow marks on the original, black tokens on the outbox. Pause on `[SSN]`, `[INSURANCE ID]`, the service date `11/02/2026`, and `$186.40` | “Left side stays here. Right side is the outbox: the only text that can leave. The service date and the amount due are still there. The identifiers are not.” |
| 0:55–1:10 | Click **Approve and copy for ChatGPT**, then open **Ledger** and expand the row | Copied confirmation, ledger preview | “I approve it. The ledger stores the redacted preview, the destination, and the counts. The original is not in this log.” |
| 1:10–1:22 | Back to the outbox. Load **Caregiver note**. Scan. | “Maya Chen” still visible in both columns. Sertraline already a token | “The medication was labeled by the detector. Her name is only in a sentence, so it is still in the outbox. That is the gap.” |
| 1:22–1:48 | **Rules**. Click the Maya Chen example. Save. Return. Scan again. | Interpretation “Always redact Maya Chen.” Then `[NAME]` in the outbox | “I write the rule the way I would say it: never send my kid's name Maya Chen. It is parsed on the device. The next scan hides that name.” |
| 1:48–2:15 | **Screenshot**. **Render the sample bill**. Wait for OCR. | Original canvas beside the barred image | “A photo of the same bill. OCR runs here. The bars are painted here. The picture is not uploaded.” |
| 2:15–2:32 | Chrome side panel on a chat site, or a local textarea if the chat site is awkward | **Check with PlainSight**, the outbox, **Approve redacted text** replacing the field | “The extension does the same check in the composer. I approve, and the field becomes the redacted text before I hit send.” |
| 2:32–2:48 | Back to the outbox. Click **Step 3: the reply comes back** | A tokenized reply beside the restored sentence, and the line “Do not paste this into the chatbot.” | “The chatbot answers in tokens. PlainSight puts the name and the SSN back on this device, in the order they appeared. That sentence is not copied and not logged.” |
| 2:48–3:00 | Badge close-up, then **Impact**, then the wordmark | Path badge, the measured character total | “When Gemini Nano is on this Chrome, Firebase AI Logic runs the model here. If it is not, the cloud only receives the redacted outbox, and only after I agree. The impact page is the same detector on all five fictional files.” |

## Capture notes

- Hide bookmarks and any logged-in account name.
- Do not open a real medical portal.
- If the cloud button is in the shot, read the payload preview out loud and point at a `[SSN]` token before clicking. Skip the click if the recording would show a network failure.
- Export the ledger only if there is time. The expanded row is enough.
- End on the outbox, not on a settings page.
