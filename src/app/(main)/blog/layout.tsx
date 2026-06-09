import type { Metadata } from 'next';
import { SEATING_APP_NAME_ZH } from '@/lib/brand';

export const metadata: Metadata = {
  title: `婚礼筹备博客 | ${SEATING_APP_NAME_ZH}`,
  description: '婚礼筹备与排座文章：如何安排宾客、避免常见错误。支持简体中文等六种语言界面切换。',
  keywords: 'wedding planning blog, seating arrangement tips, wedding planning guides, wedding advice, planiranje venčanja, consejos para bodas, hochzeitsplanung tipps, conseils mariage',
  openGraph: {
    title: `Blog | ${SEATING_APP_NAME_ZH}`,
    description: 'Expert wedding planning advice and guides. Learn how to arrange guests, avoid common mistakes, and create an unforgettable atmosphere.',
    type: 'website',
    url: 'https://weddingseats.app/blog',
  },
  alternates: {
    canonical: 'https://weddingseats.app/blog',
    languages: {
      'zh-Hans': 'https://weddingseats.app/blog?lang=zh',
      'en': 'https://weddingseats.app/blog?lang=en',
      'hr': 'https://weddingseats.app/blog?lang=hr',
      'es': 'https://weddingseats.app/blog?lang=es',
      'de': 'https://weddingseats.app/blog?lang=de',
      'fr': 'https://weddingseats.app/blog?lang=fr',
      'x-default': 'https://weddingseats.app/blog?lang=zh',
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

