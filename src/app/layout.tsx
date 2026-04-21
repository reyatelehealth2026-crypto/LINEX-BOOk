import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { ThemeProvider } from "@/lib/theme-context";
import { DEFAULT_THEME_ID, isValidThemeId, type ThemeId } from "@/lib/themes";
import { getShopBySlug } from "@/lib/supabase";
import "./globals.css";

export const metadata: Metadata = {
  title: "LineBook — ระบบจองคิว",
  description: "จองคิวผ่าน LINE สำหรับร้านตัดผม ร้านเสริมสวย ร้านทำเล็บ",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolve shop from middleware-injected header. Root domain has no slug →
  // marketing uses DEFAULT_THEME_ID.
  let themeId: ThemeId = DEFAULT_THEME_ID;
  try {
    const h = await headers();
    const slug = h.get("x-shop-slug");
    if (slug) {
      const shop = await getShopBySlug(slug);
      if (shop && isValidThemeId(shop.theme_id)) {
        themeId = shop.theme_id as ThemeId;
      }
    }
  } catch {
    /* ignore */
  }
  return (
    <html lang="th">
      <body>
        <ThemeProvider initialThemeId={themeId}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
