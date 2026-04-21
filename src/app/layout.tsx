import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/lib/theme-context";
import { getShopThemeId } from "@/lib/shop-theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "LineBook — ระบบจองคิว",
  description: "จองคิวผ่าน LINE สำหรับร้านตัดผม ร้านเสริมสวย ร้านทำเล็บ"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Server-side seed so the shop's theme is applied on first paint (no flash).
  const initialThemeId = await getShopThemeId();
  return (
    <html lang="th">
      <body>
        <ThemeProvider initialThemeId={initialThemeId}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
