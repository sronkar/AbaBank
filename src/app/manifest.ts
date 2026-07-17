import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AbaBank — The Family Bank",
    short_name: "AbaBank",
    description: "Parents are the bank, kids are the customers.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf3e4",
    theme_color: "#ffd84d",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
