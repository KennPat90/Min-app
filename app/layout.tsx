import type { Metadata } from "next";
import type { Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import TopTabs from "@/app/components/TopTabs";
import PwaRegister from "@/app/components/PwaRegister";

export const metadata: Metadata = {
  title: "Customers MVP",
  description: "Simple customer management MVP",
  manifest: "/manifest.webmanifest",
  applicationName: "Customers MVP",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Customers MVP"
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  themeColor: "#111827"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="da">
      <body>
        <PwaRegister />
        <div className="container">
          <TopTabs />
          {children}
        </div>
      </body>
    </html>
  );
}

