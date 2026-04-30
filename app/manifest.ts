import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Customers MVP",
    short_name: "Customers",
    description: "Planlaeg og haandter kunder, sager og fakturering.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#111827",
    lang: "da",
    icons: [
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png"
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png"
      }
    ]
  };
}
