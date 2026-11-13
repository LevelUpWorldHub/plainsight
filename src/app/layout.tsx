import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Source_Sans_3 } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import { SiteShell } from "@/components/site-shell";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex",
});

export const metadata: Metadata = {
  title: {
    default: "PlainSight",
    template: "%s · PlainSight",
  },
  description:
    "See exactly what leaves your device before medical paperwork reaches an AI chatbot or a web form.",
  applicationName: "PlainSight",
  appleWebApp: {
    capable: true,
    title: "PlainSight",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#1d4f4a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sourceSans.variable} ${fraunces.variable} ${plex.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <SiteShell>{children}</SiteShell>
        <PwaRegister />
      </body>
    </html>
  );
}
