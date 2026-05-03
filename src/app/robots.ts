import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: ['*', 'GPTBot', 'CCBot', 'Applebot', 'FacebookBot', 'ClaudeBot', 'PerplexityBot'],
      allow: '/',
    },
    sitemap: 'https://linkzip-saas.vercel.app/sitemap.xml',
  };
}
