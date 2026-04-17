import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Intel Brief",
  description: "AI-powered intelligence briefings on any topic",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full" style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>
        <div className="max-w-2xl mx-auto px-6 pb-20">
          <header className="py-8 mb-2">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div
                className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                style={{ background: "#1a1a1a" }}
              >
                IB
              </div>
              <span
                className="text-sm font-semibold tracking-tight"
                style={{ color: "#1a1a1a" }}
              >
                Intel Brief
              </span>
            </Link>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
