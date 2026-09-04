import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { NavLinks } from "@/components/NavLinks";
import { ModeBanner } from "@/components/ModeBanner";
import { modelEnabled, MODEL } from "@/lib/ai/client";

/* TODO: point at the deployed portfolio once it is live; LinkedIn until then. */
const PORTFOLIO_URL = "https://www.linkedin.com/in/ibider/";

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
        <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
          <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3">
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
            <div className="flex items-center gap-3">
              <NavLinks />
              <ModeBanner modelEnabled={enabled} model={MODEL} />
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-content px-5 py-7 sm:py-9">
          {children}
        </main>
        <footer className="mt-12 border-t border-line">
          <div className="mx-auto flex max-w-content flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-5 py-6 text-[12px] text-muted">
            <p>
              <span className="text-ink-soft">TrustLayer</span> · Independent AI product experiment ·
              2026
            </p>
            <p>Synthetic scenarios and simulated external tools</p>
            <a
              href={PORTFOLIO_URL}
              className="underline underline-offset-4 hover:text-ink"
              target="_blank"
              rel="noreferrer"
            >
              Isabella Bider
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
