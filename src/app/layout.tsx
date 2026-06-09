import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import DevToolsIndicatorZh from "@/components/DevToolsIndicatorZh";
import { COUPLE_NAMES_ZH, SEATING_APP_NAME_ZH } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: SEATING_APP_NAME_ZH,
  description:
    `${SEATING_APP_NAME_ZH}：拖拽排桌、桌位与场地布局；数据保存在本机浏览器，可导出 PDF、CSV、JSON，支持多语言界面，无需注册。`,
  keywords: [
    "婚礼座位表",
    "婚宴排座",
    "婚礼宾客座位",
    "座位图",
    "婚宴桌位",
    "婚礼筹备",
    "wedding seating planner",
    "seating chart",
    "wedding table planner",
    "plan de table mariage",
    "Hochzeitssitzordnung",
    "planificador mesas boda",
  ],
  authors: [{ name: COUPLE_NAMES_ZH }],
  creator: COUPLE_NAMES_ZH,
  publisher: COUPLE_NAMES_ZH,
  metadataBase: new URL('https://wedding-seats.com'),
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: `${SEATING_APP_NAME_ZH}｜拖拽排桌 · 导出 PDF`,
    description:
      `${SEATING_APP_NAME_ZH}：本地保存、多语言、导出 PDF/CSV，便于现场与婚庆沟通。`,
    type: "website",
    locale: "zh_CN",
    siteName: SEATING_APP_NAME_ZH,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: SEATING_APP_NAME_ZH,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SEATING_APP_NAME_ZH,
    description: `${SEATING_APP_NAME_ZH}：拖拽排桌、本机保存、导出 PDF，支持简体中文等语言。`,
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
  },
  other: {
    'msvalidate.01': 'your-bing-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hans" suppressHydrationWarning>
      <head>
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />

        {/* Multi-language support hints */}
        <meta name="available-languages" content="zh,en,hr,es,de,fr" />
        <meta name="default-language" content="zh" />
      </head>
      <body className="antialiased">
        {children}
        <Analytics />
        <DevToolsIndicatorZh />
      </body>
    </html>
  );
}
