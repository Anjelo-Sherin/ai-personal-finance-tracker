import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/formatters";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/how-it-works",
    "/case-studies",
    "/faq",
    "/contact",
    "/privacy",
    "/terms",
    "/login",
    "/signup",
  ];
  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route === "" ? 1.0 : 0.8,
  }));
}
