import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import "./globals.css";
import "katex/dist/katex.min.css";
import { ThemeToggle } from "@/components/theme-toggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "Drill4 | Multiple-choice practice assistant";
const description = "Interactive multiple-choice practice with custom scoring, shuffling, and instant feedback.";

export const metadata: Metadata = {
  title: {
    default: title,
    template: "%s | Drill4",
  },
  description,
  keywords: ["multiple choice", "quiz", "practice", "study", "flashcards", "test prep", "assessment"],
  authors: [{ name: "Drill4" }],
  creator: "Drill4",
  publisher: "Drill4",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title,
    description,
    siteName: "Drill4",
    type: "website",
    locale: "en_GB",
    url: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-50`}
      >
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <header className="mb-6 flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
            <Link href="/" className="font-semibold text-3xl tracking-tight ">
              Drill4
            </Link>
            <div className="flex gap-4 items-center">
              <Link href="/" className="text-sm font-medium hover:underline text-slate-500 dark:text-slate-300">
                Home
              </Link>
              <Link href="/format" className="hidden sm:block text-sm font-medium hover:underline text-slate-500 dark:text-slate-300">
                File format
              </Link>
              <a href="https://github.com/vende11s/drill4" target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline text-slate-500 dark:text-slate-300">
                Source
              </a>
              <ThemeToggle />
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
