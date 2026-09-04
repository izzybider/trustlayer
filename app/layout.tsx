import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { NavLinks } from "@/components/NavLinks";
import { ModeBanner } from "@/components/ModeBanner";
import { modelEnabled, MODEL } from "@/lib/ai/client";

export const metadata: Metadata = {
  title: "TrustLayer — decide before you answer",
  description:
    "An independent AI product experiment: a decision-policy layer that chooses ANSWER, ASK, VERIFY or ESCALATE before an assistant generates or executes a response.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const enabled = modelEnabled();
  return (
    <html lang="en">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:px-3 focus:py-2 focus:text-sm"
        >
          Skip to content
        </a>
        <header className="border-b border-line bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75 sticky top-0 z-40">
          <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-3 px-5 py-3.5">
            <Link href="/" className="flex items-baseline gap-2.5">
              <span
                className="text-[17px] font-semibold tracking-tight"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                TrustLayer
              </span>
              <span className="hidden text-[12px] text-muted sm:inline">
                decide before you answer
              </span>
            </Link>
            <NavLinks />
          </div>
        </header>
        <ModeBanner modelEnabled={enabled} model={MODEL} />
        <main id="main" className="mx-auto max-w-content px-5 py-8 sm:py-10">
          {children}
        </main>
        <footer className="mt-16 border-t border-line">
          <div className="mx-auto max-w-content px-5 py-8 text-[12.5px] leading-relaxed text-muted">
            <p className="max-w-2xl">
              TrustLayer is an independent AI product and evaluation experiment built with synthetic
              scenarios and simulated tools. It is not deployed in any real workflow, and the
              payments, account, analytics and care-operations tools read local JSON fixtures only.
            </p>
            <p className="mt-3">Portfolio project · 2026</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
