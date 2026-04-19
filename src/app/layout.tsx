import type { Metadata, Viewport } from "next";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
