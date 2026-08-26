import type { Metadata } from "next";
import PortalApp from "../PortalApp";

export const metadata: Metadata = {
  title: "Public Posts",
  description:
    "Browse active Bidder Portal posts from clients and job bidders, then sign up to message members, start contracts, and manage work through Digniware.",
  alternates: {
    canonical: "/posts",
  },
};

export default function PostsPage() {
  return <PortalApp />;
}
