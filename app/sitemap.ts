type BlogPost = {
  slug: string;
  created_at: string;
};

type SitemapEntry = {
  url: string;
  lastModified: string;
  changeFrequency:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
};

export default async function sitemap(): Promise<SitemapEntry[]> {
  const baseUrl = "https://restockradar.com";

  const staticPages: SitemapEntry[] = [
    {
      url: baseUrl,
      lastModified: new Date().toISOString(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${baseUrl}/dashboard`,
      lastModified: new Date().toISOString(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/features`,
      lastModified: new Date().toISOString(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  return [...staticPages];
}
