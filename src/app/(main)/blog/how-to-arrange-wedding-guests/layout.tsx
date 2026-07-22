import type { Metadata } from 'next';
import { SEATING_APP_NAME_ZH } from '@/lib/brand';
import { siteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  title: `怎样排座让大家尽兴 | ${SEATING_APP_NAME_ZH}`,
  description: 'Complete guide to creating the ideal wedding seating arrangement. Learn how to group guests, balance tables, and create an atmosphere everyone will enjoy. Available in English, Croatian, Spanish, German, and French.',
  keywords: 'how to arrange wedding guests, wedding seating guide, guest seating tips, wedding table arrangement, how to seat guests, wedding seating plan guide, make guests happy wedding, kako rasporediti goste, cómo organizar invitados',
  openGraph: {
    title: 'How to Arrange Wedding Guests So Everyone Is Happy - Complete Guide',
    description: 'Complete guide to creating the ideal wedding seating arrangement. Learn how to group guests, balance tables, and create an atmosphere everyone will enjoy.',
    type: 'article',
    url: siteUrl('/blog/how-to-arrange-wedding-guests'),
    publishedTime: '2025-10-07T00:00:00Z',
    authors: ['Wedding Seats Integration'],
    tags: ['wedding planning', 'seating arrangement', 'guest arrangement', 'wedding tips', 'happy guests'],
    locale: 'en_US',
  },
  alternates: {
    canonical: siteUrl('/blog/how-to-arrange-wedding-guests'),
    languages: {
      'zh-Hans': siteUrl('/blog/how-to-arrange-wedding-guests?lang=zh'),
      'en': siteUrl('/blog/how-to-arrange-wedding-guests?lang=en'),
      'hr': siteUrl('/blog/how-to-arrange-wedding-guests?lang=hr'),
      'es': siteUrl('/blog/how-to-arrange-wedding-guests?lang=es'),
      'de': siteUrl('/blog/how-to-arrange-wedding-guests?lang=de'),
      'fr': siteUrl('/blog/how-to-arrange-wedding-guests?lang=fr'),
      'x-default': siteUrl('/blog/how-to-arrange-wedding-guests?lang=zh'),
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
