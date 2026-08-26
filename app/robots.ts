import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bp.digniware.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/posts"],
        disallow: [
          "/bidder-settings",
          "/bidders",
          "/billing",
          "/chat",
          "/clients",
          "/contracts",
          "/credits",
          "/dashboard",
          "/disputes",
          "/operations",
          "/payments",
          "/people",
          "/profile",
          "/settings",
          "/work",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
