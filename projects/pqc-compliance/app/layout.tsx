import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Groundstate",
  description: "NIS2 · DORA · NIST FIPS compliance dashboard for post-quantum cryptography",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full" style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>
        <div className="max-w-2xl mx-auto px-6 pb-20">
          <header className="py-8 mb-2 flex items-center justify-between">
            <div className="inline-flex items-center gap-2.5">
              <div
                className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                style={{ background: "#1a1a1a" }}
              >
                GS
              </div>
              <span className="text-sm font-semibold tracking-tight" style={{ color: "#1a1a1a" }}>
                Groundstate
              </span>
            </div>
            <div className="flex items-center gap-3">
              {(["NIS2", "DORA", "FIPS 203", "FIPS 204"] as const).map(f => (
                <span key={f} className="hidden sm:inline text-xs font-mono" style={{ color: "#bbb" }}>{f}</span>
              ))}
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
