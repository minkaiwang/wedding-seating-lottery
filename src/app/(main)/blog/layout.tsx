import type { Metadata } from 'next';
import { SEATING_APP_NAME_ZH } from '@/lib/brand';
import { siteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  title: `婚礼筹备博客 | ${SEATING_APP_NAME_ZH}`,
  description: '婚礼筹备与排座文章：如何安排宾客、避免常见错误。支持简体中文等六种语言界面切换。',
  keywords: 'wedding planning blog, seating arrangement tips, wedding planning guides, wedding advice, planiranje venčanja, consejos para bodas, hochzeitsplanung tipps, conseils mariage',
  openGraph: {
    title: `Blog | ${SEATING_APP_NAME_ZH}`,
    description: 'Expert wedding planning advice and guides. Learn how to arrange guests, avoid common mistakes, and create an unforgettable atmosphere.',
    type: 'website',
    url: siteUrl('/blog'),
  },
  alternates: {
    canonical: siteUrl('/blog'),
    languages: {
      'zh-Hans': siteUrl('/blog?lang=zh'),
      'en': siteUrl('/blog?lang=en'),
      'hr': siteUrl('/blog?lang=hr'),
      'es': siteUrl('/blog?lang=es'),
      'de': siteUrl('/blog?lang=de'),
      'fr': siteUrl('/blog?lang=fr'),
      'x-default': siteUrl('/blog?lang=zh'),
    },
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
