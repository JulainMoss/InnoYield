import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import Sidebar from "@/components/layout/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InnoYield — Rynek Pomysłów",
  description: "Waliduj i obstawiaj innowacyjne pomysły",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full bg-[#0a0b0f]">
        <AppProvider>
          <div className="flex min-h-screen">
            <Suspense fallback={<div className="w-60 bg-[#0e0f14] border-r border-[#1e2028]" />}>
              <Sidebar />
            </Suspense>
            <main className="flex-1 ml-60 min-h-screen">
              {children}
            </main>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
