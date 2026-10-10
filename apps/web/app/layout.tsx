import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { isLang, LANG_COOKIE } from "@/lib/i18n/core";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Newsreader({ subsets: ["latin"], variable: "--font-serif-display", display: "swap" });

export const metadata: Metadata = {
  title: { default: "AgriSense", template: "%s | AgriSense" },
  description:
    "AgriSense shows which crops have historically been grown in your district and season, with weather context and honest limits.",
  applicationName: "AgriSense",
  appleWebApp: { capable: true, title: "AgriSense", statusBarStyle: "default" },
  icons: { icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }], apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#19342d",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const raw = store.get(LANG_COOKIE)?.value;
  const lang = isLang(raw) ? raw : "en";
  return (
    <html lang={lang} className={`${inter.variable} ${serif.variable}`}>
      <body className="min-h-dvh">
        <Providers initialLang={lang} explicit={isLang(raw)}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
