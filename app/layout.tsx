import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bp.digniware.com";
const seoTitle = "Bidder Portal | Digniware";
const seoDescription =
  "Bidder Portal by Digniware helps clients and job bidders manage posts, contracts, work logs, credits, payments, and direct communication in one secure portal.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Bidder Portal",
  title: {
    default: seoTitle,
    template: "%s | Bidder Portal",
  },
  description: seoDescription,
  keywords: [
    "bidder portal",
    "Digniware bidder portal",
    "job bidder portal",
    "bidder work logs",
    "client bidder contracts",
    "remote bidder management",
    "bidder payment portal",
  ],
  authors: [{ name: "Digniware LLC", url: "https://digniware.com/" }],
  creator: "Digniware LLC",
  publisher: "Digniware LLC",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Bidder Portal",
    title: seoTitle,
    description: seoDescription,
    images: [
      {
        url: "/digniware-logo-dark.png",
        width: 1024,
        height: 1024,
        alt: "Bidder Portal by Digniware",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: seoTitle,
    description: seoDescription,
    images: ["/digniware-logo-dark.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  other: {
    cryptomus: "d8702318",
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
