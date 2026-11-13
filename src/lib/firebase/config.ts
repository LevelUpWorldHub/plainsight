export interface FirebasePublicConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  recaptchaSiteKey: string;
  appCheckDebug: boolean;
  cloudModel: string;
}

export function readFirebasePublicConfig(): FirebasePublicConfig {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
    recaptchaSiteKey: process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY ?? "",
    appCheckDebug: process.env.NEXT_PUBLIC_APPCHECK_DEBUG === "true",
    cloudModel: process.env.NEXT_PUBLIC_FIREBASE_CLOUD_MODEL || "gemini-3.5-flash-lite",
  };
}

export function isFirebaseConfigured(
  config: FirebasePublicConfig = readFirebasePublicConfig(),
): boolean {
  return Boolean(
    config.apiKey && config.projectId && config.appId && config.recaptchaSiteKey,
  );
}
