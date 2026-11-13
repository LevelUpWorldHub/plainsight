"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from "firebase/app-check";
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  InferenceSource,
  type GenerativeModel,
} from "firebase/ai";
import type { ModelRunner } from "@/lib/phi/model";
import { isFirebaseConfigured, readFirebasePublicConfig } from "./config";

let appCheck: AppCheck | null = null;
let modelPromise: Promise<GenerativeModel | null> | null = null;

interface PromptLanguageModel {
  availability?: () => Promise<string>;
}

function debugScope(): { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string } {
  return globalThis as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string };
}

function ensureAppCheck(app: FirebaseApp): void {
  if (appCheck) return;
  const config = readFirebasePublicConfig();
  if (config.appCheckDebug) {
    debugScope().FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(config.recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export function getPlainSightModel(): Promise<GenerativeModel | null> {
  if (!modelPromise) {
    modelPromise = createModel().catch((error) => {
      modelPromise = null;
      throw error;
    });
  }
  return modelPromise;
}

async function createModel(): Promise<GenerativeModel | null> {
  const config = readFirebasePublicConfig();
  if (!isFirebaseConfigured(config)) return null;
  const app =
    getApps()[0] ??
    initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
    });
  ensureAppCheck(app);
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, {
    mode: InferenceMode.PREFER_ON_DEVICE,
    inCloudParams: { model: config.cloudModel },
  });
}

export async function isOnDeviceModelReady(): Promise<boolean> {
  const languageModel = (globalThis as { LanguageModel?: PromptLanguageModel }).LanguageModel;
  if (!languageModel?.availability) return false;
  try {
    const status = await languageModel.availability();
    return status === "available" || status === "readily";
  } catch {
    return false;
  }
}

export function createFirebaseModelRunner(): ModelRunner {
  return {
    isOnDeviceReady: isOnDeviceModelReady,
    generate: async (request) => {
      const model = await getPlainSightModel();
      if (!model) throw new Error("Firebase is not configured");
      if (request.path === "on_device") {
        await model.initializeDeviceModel(() => undefined);
      } else {
        try {
          await model.initializeDeviceModel(() => undefined);
        } catch {
          // Nano can be missing. prefer_on_device then uses the cloud model.
        }
      }
      const result = await model.generateContent(request.prompt);
      const source = result.response.inferenceSource;
      return {
        text: result.response.text(),
        inferenceSource:
          source === InferenceSource.ON_DEVICE
            ? "on_device"
            : source === InferenceSource.IN_CLOUD
              ? "in_cloud"
              : "unknown",
      };
    },
  };
}
