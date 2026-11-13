import type { HybridPrompt } from "./types";

export interface ModelResponse {
  text: string;
  inferenceSource: "on_device" | "in_cloud" | "unknown";
}

export interface ModelRunner {
  isOnDeviceReady: () => Promise<boolean>;
  generate: (
    request: HybridPrompt,
    hooks?: { onDownloadProgress?: (ratio: number) => void },
  ) => Promise<ModelResponse>;
}
