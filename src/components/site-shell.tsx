"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

function OfflineNote() {
  const [offline, setOffline] = useState(
    () => typeof navigator !== "undefined" && navigator.onLine === false,
  );
  useEffect(() => {
    const sync = () => setOffline(navigator.onLine === false);
    window.addEventListener("offline", sync);
    window.addEventListener("online", sync);
    return () => {
      window.removeEventListener("offline", sync);
      window.removeEventListener("online", sync);
    };
  }, []);
  if (!offline) return null;
  return (
    <p role="status" className="bg-accent px-4 py-2 text-center text-sm text-accent-foreground">
      This browser is offline. The detector, rules, and ledger still run here. Cloud Gemini does not.
    </p>
  );
}

const NAV = [
  { href: "/", label: "Outbox" },
  { href: "/image", label: "Screenshot" },
  { href: "/rules", label: "Rules" },
  { href: "/ledger", label: "Ledger" },
  { href: "/how", label: "How it works" },
];

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-full flex-col">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to the outbox
      </a>
      <div className="h-1 bg-primary" />
      <OfflineNote />
      <header className="border-b border-border bg-card/80">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <Link href="/" className="group block">
              <span className="font-heading text-2xl tracking-tight text-foreground">
                Plain
                <span className="relative inline-block">
                  Sight
                  <span className="absolute inset-x-0 top-[52%] h-[3px] bg-foreground/90" />
                </span>
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Medical paperwork, checked before it leaves.
              </span>
            </Link>
            <p className="stamp hidden text-primary sm:block">Held on device</p>
          </div>
          <nav aria-label="Primary" className="flex gap-1 overflow-x-auto pb-1">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main id="content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <footer className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
        PlainSight records the redacted outbox on this device. It does not create an account or upload the original.
      </footer>
    </div>
  );
}
