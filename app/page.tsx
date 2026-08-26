import PortalApp from "./PortalApp";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bp.digniware.com";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Bidder Portal",
  url: siteUrl,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Bidder Portal by Digniware helps clients and job bidders manage posts, contracts, work logs, credits, payments, and direct communication.",
  publisher: {
    "@type": "Organization",
    name: "Digniware LLC",
    url: "https://digniware.com/",
    logo: `${siteUrl}/digniware-logo-dark.png`,
  },
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <PortalApp />
    </>
  );
}
