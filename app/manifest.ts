import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Memoria — Study notes",
    short_name: "Memoria",
    description: "Your notes, study guides, books, and practice, ready when you are.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#f6f6ef",
    theme_color: "#f6f6ef",
    icons: [
      { src: "/icon-192.png", type: "image/png", sizes: "192x192", purpose: "any" },
      { src: "/icon-512.png", type: "image/png", sizes: "512x512", purpose: "maskable" },
    ],
  };
}
