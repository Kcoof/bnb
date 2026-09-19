import type { MetadataRoute } from "next";

// Token links must never be indexed — plan §3.3.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: ["/chat/", "/c/", "/api/"],
    },
  };
}
