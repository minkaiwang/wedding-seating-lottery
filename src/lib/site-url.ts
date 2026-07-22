/**
 * Public URL used for metadata, sitemap, robots and structured data.
 * Set NEXT_PUBLIC_SITE_URL to the final HTTPS deployment origin. Keeping the
 * localhost fallback avoids claiming ownership of an upstream domain in forks.
 */
const fallbackSiteUrl = 'http://localhost:3000';

export function normalizeSiteUrl(value: string) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return fallbackSiteUrl;
    return parsed.origin;
  }
  catch {
    return fallbackSiteUrl;
  }
}

export const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL ?? fallbackSiteUrl,
);

export function siteUrl(path = '/') {
  return new URL(path, SITE_URL).toString();
}
