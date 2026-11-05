import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SettingsProvider } from "@/lib/settings/SettingsContext";
import RegisterSW from "@/components/ui/RegisterSW";

export const metadata: Metadata = {
  title: "已讀不回",
  description: "北漂工程師的交友軟體模擬，只會失敗",
  applicationName: "已讀不回",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "已讀不回",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#14142a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className="h-full">
      <head>
        <link rel="icon" href="/icons/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="min-h-full flex flex-col">
        <SettingsProvider>
          {children}
          <RegisterSW />
        </SettingsProvider>
      </body>
    </html>
  );
}
