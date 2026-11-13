import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PlainSight",
    short_name: "PlainSight",
    description:
      "Redact personal and medical information on this device before it reaches an AI tool.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f0e6",
    theme_color: "#1d4f4a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
