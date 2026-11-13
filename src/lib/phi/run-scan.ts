import { detectHeuristic } from "./detect";
import { assertCloudPayloadIsRedacted, buildHybridPrompt } from "./hybrid";
import type { ModelRunner } from "./model";
import { resolveOverlaps } from "./overlap";
import { parseModelFindings, placeFindingsInOriginal } from "./parse-model";
import { redact } from "./redact";
import { applyRules } from "./rules";
import type { PrivacyRule, ScanResult } from "./types";

export interface ScanOptions {
  firebaseConfigured: boolean;
  allowCloud: boolean;
  model?: ModelRunner;
}

export async function runScan(
  original: string,
  rules: PrivacyRule[],
  options: ScanOptions,
): Promise<ScanResult> {
  const heuristic = applyRules(detectHeuristic(original), original, rules);
  const redactedFirst = redact(original, heuristic);
  let findings = heuristic;
  let path: ScanResult["path"] = "heuristic_only";
  let detail =
    "Deterministic detector on this device. No model was called.";

  const canCallModel = options.firebaseConfigured && options.model;
  if (!canCallModel) {
    if (!options.firebaseConfigured) {
      detail =
        "Deterministic detector on this device. Add a Firebase project to compare this result with Gemini Nano.";
    }
    return {
      original,
      redacted: redactedFirst,
      findings,
      path,
      detail,
      cloudOffer: null,
    };
  }

  let onDeviceReady = false;
  try {
    onDeviceReady = await options.model!.isOnDeviceReady();
  } catch {
    onDeviceReady = false;
  }

  if (!onDeviceReady && !options.allowCloud) {
    return {
      original,
      redacted: redactedFirst,
      findings,
      path,
      detail:
        "Gemini Nano is not ready in this browser. The result below is from the on-device detector. Cloud Gemini is optional and only receives the redacted text.",
      cloudOffer: redactedFirst,
    };
  }

  const request = buildHybridPrompt({
    onDeviceReady,
    firebaseConfigured: true,
    original,
    redacted: redactedFirst,
  });
  if (!request) {
    return {
      original,
      redacted: redactedFirst,
      findings,
      path,
      detail,
      cloudOffer: null,
    };
  }

  try {
    assertCloudPayloadIsRedacted(request, original, redactedFirst);
    const response = await options.model!.generate(request);
    const wentToCloud = response.inferenceSource === "in_cloud";
    const stayedOnDevice = response.inferenceSource === "on_device";

    if (request.path === "on_device" && !stayedOnDevice) {
      return {
        original,
        redacted: redactedFirst,
        findings,
        path: wentToCloud ? "cloud" : "heuristic_only",
        detail: wentToCloud
          ? "Cloud Gemini ran even though PlainSight expected Gemini Nano. Model suggestions were discarded. Review the outbox before approving."
          : "The model did not report an on-device inference source. Model suggestions were discarded.",
        cloudOffer: null,
      };
    }

    const haystack = request.path === "cloud" ? redactedFirst : original;
    const parsed = parseModelFindings(response.text, haystack);
    const placed = placeFindingsInOriginal(
      original,
      parsed,
      request.path === "cloud" ? redactedFirst : undefined,
    );
    findings = applyRules(
      resolveOverlaps([...heuristic, ...placed]),
      original,
      rules,
    );
    const redacted = redact(original, findings);

    if (request.path === "cloud" || wentToCloud) {
      path = "cloud";
      detail =
        "Cloud Gemini saw only the already-redacted text. Leftovers it found were added to the outbox.";
    } else if (stayedOnDevice) {
      path = "on_device";
      detail =
        "Gemini Nano ran on this device through Firebase AI Logic (prefer_on_device). The original did not leave.";
    }

    return { original, redacted, findings, path, detail, cloudOffer: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return {
      original,
      redacted: redactedFirst,
      findings,
      path: "heuristic_only",
      detail: `The model call failed (${message}). Showing the on-device detector result.`,
      cloudOffer: onDeviceReady ? null : redactedFirst,
    };
  }
}
