import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PaisaPulse — AI Personal Finance Tracker",
    short_name: "PaisaPulse",
    description:
      "Paste a bank SMS or CSV, get categorized spending, anomaly flags, and a monthly forecast.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF0F5",
    theme_color: "#D81B60",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
