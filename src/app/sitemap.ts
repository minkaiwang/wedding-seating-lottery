import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://wedding-seats.com'
  const currentDate = new Date()

  return [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 1.0,
      alternates: {
        languages: {
          'zh-Hans': `${baseUrl}/?lang=zh`,
          en: `${baseUrl}/?lang=en`,
          hr: `${baseUrl}/?lang=hr`,
          es: `${baseUrl}/?lang=es`,
          de: `${baseUrl}/?lang=de`,
          fr: `${baseUrl}/?lang=fr`,
        },
      },
    },
    {
      url: `${baseUrl}/guests`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tables`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/seating`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/layout`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/preview`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog/5-wedding-seating-mistakes`,
      lastModified: new Date('2025-10-06'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog/how-to-arrange-wedding-guests`,
      lastModified: new Date('2025-10-07'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}
