import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SaudiQR | منيو رقمي للمطاعم والكافيهات",
  description:
    "منصة سعودية لإنشاء منيو إلكتروني احترافي مع QR Code قابل للتحديث في أي وقت.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}