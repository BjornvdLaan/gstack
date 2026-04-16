import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Intel Brief — AI Intelligence Briefings",
  description: "Personalized intelligence briefings on any topic",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-zinc-50 font-sans antialiased">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <header className="mb-10">
            <a href="/" className="inline-flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-md bg-zinc-900 flex items-center justify-center">
                <span className="text-white text-xs font-bold">IB</span>
              </div>
              <span className="font-semibold text-zinc-900 group-hover:text-zinc-600 transition-colors">
                Intel Brief
              </span>
            </a>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
