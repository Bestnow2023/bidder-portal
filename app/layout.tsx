import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bidder Work Portal",
  description: "Internal portal for bidder work logs, payment details, schedules, history, and admin chat.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  other: {
    cryptomus: "a364d755",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
