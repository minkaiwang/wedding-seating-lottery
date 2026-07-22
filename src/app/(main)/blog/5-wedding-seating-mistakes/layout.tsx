import type { Metadata } from 'next';
import { SEATING_APP_NAME_ZH } from '@/lib/brand';
import { siteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  title: `婚礼排座五大误区 | ${SEATING_APP_NAME_ZH}`,
  description: 'Discover the 5 most common mistakes couples make when arranging wedding guests and how to avoid them for a perfect atmosphere. Practical tips from wedding planning experts. Available in English, Croatian, Spanish, German, and French.',
  keywords: 'wedding seating mistakes, seating plan errors, wedding planning mistakes, guest arrangement tips, wedding seating chart, how to seat wedding guests, wedding table plan mistakes, greške raspored gostiju, errores mesas boda',
  openGraph: {
    title: '5 Wedding Guest Seating Mistakes (And How to Avoid Them)',
    description: 'Discover the 5 most common mistakes couples make when arranging wedding guests and how to avoid them for a perfect atmosphere. Practical tips from wedding planning experts.',
    type: 'article',
    url: siteUrl('/blog/5-wedding-seating-mistakes'),
    publishedTime: '2025-10-06T00:00:00Z',
    authors: ['Wedding Seats Integration'],
    tags: ['wedding planning', 'seating arrangement', 'wedding tips', 'guest seating'],
    locale: 'en_US',
  },
  alternates: {
    canonical: siteUrl('/blog/5-wedding-seating-mistakes'),
    languages: {
      'zh-Hans': siteUrl('/blog/5-wedding-seating-mistakes?lang=zh'),
      'en': siteUrl('/blog/5-wedding-seating-mistakes?lang=en'),
      'hr': siteUrl('/blog/5-wedding-seating-mistakes?lang=hr'),
      'es': siteUrl('/blog/5-wedding-seating-mistakes?lang=es'),
      'de': siteUrl('/blog/5-wedding-seating-mistakes?lang=de'),
      'fr': siteUrl('/blog/5-wedding-seating-mistakes?lang=fr'),
      'x-default': siteUrl('/blog/5-wedding-seating-mistakes?lang=zh'),
    },
  },
};

export default function ArticleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
