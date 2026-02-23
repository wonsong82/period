import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Period Tracker",
  description: "Track your menstrual cycle and fertility window",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen">
          <nav className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="flex items-center justify-between h-14">
                <Link
                  href="/"
                  className="text-lg font-semibold text-stone-800"
                >
                  Period Tracker
                </Link>
                <div className="flex gap-1">
                  <Link
                    href="/"
                    className="px-3 py-1.5 rounded-md text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                  >
                    Calendar
                  </Link>
                  <Link
                    href="/settings"
                    className="px-3 py-1.5 rounded-md text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                  >
                    Settings
                  </Link>
                </div>
              </div>
            </div>
          </nav>
          <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
