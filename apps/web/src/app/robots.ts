import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/formatters";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
