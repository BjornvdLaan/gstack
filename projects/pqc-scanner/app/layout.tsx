import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Observer",
  description: "AI-powered quantum cryptography risk scanner for codebases",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full" style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>
        <div className="max-w-2xl mx-auto px-6 pb-20">
          <header className="py-8 mb-2">
            <div className="inline-flex items-center gap-2.5">
              <div
                className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                style={{ background: "#1a1a1a" }}
              >
                OB
              </div>
              <span className="text-sm font-semibold tracking-tight" style={{ color: "#1a1a1a" }}>
                Observer
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: "#f0fff4", color: "#1e8449" }}
              >
                beta
              </span>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
