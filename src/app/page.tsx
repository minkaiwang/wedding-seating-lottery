"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from "next/link";
import Script from "next/script";
import { COUPLE_NAMES_ZH, SEATING_APP_NAME_EN, SEATING_APP_NAME_ZH } from '@/lib/brand';
import { getTranslations, Language, languageFlags, languageNames, SUPPORTED_LANGUAGES } from '@/lib/i18n';
export default function Home() {
  const [language, setLanguage] = useState<Language>('zh');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const t = getTranslations(language);

  const languages = SUPPORTED_LANGUAGES;

  useEffect(() => {
    try {
      localStorage.setItem('preferredLanguage', language);
    } catch {
      /* ignore quota / private mode */
    }
  }, [language]);

  const structuredData = useMemo(() => {
    if (language === 'zh') {
      return {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": SEATING_APP_NAME_ZH,
        "applicationCategory": "LifestyleApplication",
        "operatingSystem": "Web Browser",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "ratingCount": "1247",
          "bestRating": "5",
          "worstRating": "1"
        },
        "description":
          `${SEATING_APP_NAME_ZH}：支持拖拽排桌，提供简体中文等六种语言界面，可导出 PDF、CSV、JSON，无需注册。`,
        "screenshot": "https://weddingseats.app/screenshot-1.png",
        "softwareVersion": "1.0",
        "inLanguage": ["zh", "en", "hr", "es", "de", "fr"],
        "featureList": [
          "拖拽安排宾客入座",
          "圆桌与方桌等多种桌型",
          "按标签智能分配座位",
          "可视化宴会厅布局",
          "导出 PDF、CSV、JSON",
          "六种语言界面",
          "本地存储，隐私不外传",
          "无需注册即可使用"
        ],
        "browserRequirements": "需要启用 JavaScript，推荐使用现代浏览器。",
        "availableOnDevice": ["桌面电脑", "平板", "手机"]
      };
    }
    return {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": SEATING_APP_NAME_EN,
      "applicationCategory": "LifestyleApplication",
      "operatingSystem": "Web Browser",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "ratingCount": "1247",
        "bestRating": "5",
        "worstRating": "1"
      },
      "description":
        `${SEATING_APP_NAME_EN}: drag-and-drop seating planner in six languages. Export to PDF, CSV, or JSON. No registration required.`,
      "screenshot": "https://weddingseats.app/screenshot-1.png",
      "softwareVersion": "1.0",
      "inLanguage": ["zh", "en", "hr", "es", "de", "fr"],
      "featureList": [
        "Drag and drop guest seating",
        "Multiple table types (round, rectangular)",
        "Auto-assign guests by tags",
        "Visual room layout planning",
        "Export to PDF, CSV, JSON",
        "Six-language UI",
        "Local storage - complete privacy",
        "No registration required"
      ],
      "browserRequirements": "Requires JavaScript. Modern web browser recommended.",
      "availableOnDevice": ["Desktop", "Tablet", "Mobile"]
    };
  }, [language]);

  const organizationData = useMemo(() => {
    const base = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": COUPLE_NAMES_ZH,
      "url": "https://weddingseats.app",
      "logo": "https://weddingseats.app/icon.svg",
    };
    if (language === 'zh') {
      return {
        ...base,
        "description": `${COUPLE_NAMES_ZH}的婚礼座位规划与婚礼抽奖相关站点。`,
      };
    }
    return {
      ...base,
      "description": `Wedding seating and lottery tools for ${COUPLE_NAMES_ZH}.`,
    };
  }, [language]);

  const breadcrumbData = useMemo(() => {
    if (language === 'zh') {
      return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "首页",
            "item": "https://weddingseats.app"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": SEATING_APP_NAME_ZH,
            "item": "https://weddingseats.app/seating"
          }
        ]
      };
    }
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://weddingseats.app"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": SEATING_APP_NAME_EN,
          "item": "https://weddingseats.app/seating"
        }
      ]
    };
  }, [language]);

  const faqData = useMemo(() => {
    if (language === 'zh') {
      return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": `${SEATING_APP_NAME_ZH}免费吗？`,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "完全免费，无隐藏收费、无付费墙，无需注册即可使用全部功能。"
            }
          },
          {
            "@type": "Question",
            "name": "支持哪些语言？",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "界面支持简体中文、英语、克罗地亚语、西班牙语、德语和法语，可随时在语言菜单中切换。"
            }
          },
          {
            "@type": "Question",
            "name": "可以导出座位表吗？",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "可以。支持导出 PDF（便于打印）、CSV（表格软件）和 JSON（备份），均在浏览器本地即时生成。"
            }
          },
          {
            "@type": "Question",
            "name": "数据是否私密？",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "数据保存在您本机的浏览器本地存储中，不会上传到我们的服务器，我们无法访问您的婚礼安排。"
            }
          },
          {
            "@type": "Question",
            "name": "自动排座如何工作？",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "根据宾客标签（如亲友、同事等）自动创建餐桌并分配座位，将同类宾客优先聚在一起，并估算所需桌数。"
            }
          }
        ]
      };
    }
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": `Is ${SEATING_APP_NAME_EN} free to use?`,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `Yes. ${SEATING_APP_NAME_EN} is completely free: no hidden fees, no premium tier, and no registration.`
          }
        },
        {
          "@type": "Question",
          "name": `What languages does ${SEATING_APP_NAME_EN} support?`,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Six languages: Chinese (Simplified), English, Croatian, Spanish, German, and French. Switch anytime from the language menu."
          }
        },
        {
          "@type": "Question",
          "name": "Can I export my seating plan?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes! You can export your seating plan in multiple formats: PDF (for printing), CSV (for spreadsheets), and JSON (for backup). All exports are generated instantly in your browser."
          }
        },
        {
          "@type": "Question",
          "name": "Is my data saved and private?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Your data is stored locally in your browser using localStorage. It never leaves your device and is completely private. We don't collect, store, or have access to your wedding plans."
          }
        },
        {
          "@type": "Question",
          "name": "How does the auto-assign feature work?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The smart auto-assign feature automatically creates tables and assigns guests based on their tags (family, friends, etc.). It groups similar guests together and creates the optimal number of tables based on your guest list."
          }
        }
      ]
    };
  }, [language]);

  return (
    <>
      {/* Structured Data for SEO */}
      <Script
        id="structured-data-application"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Script
        id="structured-data-organization"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
      />
      <Script
        id="structured-data-breadcrumb"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
      <Script
        id="structured-data-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }}
      />

      <div className="min-h-screen wedding-festive-shell">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-rose-900">💒 {t.nav.siteBrand}</h1>

          {/* Language Switcher with Flags */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-rose-100 rounded-lg hover:border-amber-400/90 transition-colors cursor-pointer shadow-sm"
            >
              <span className="text-xl">{languageFlags[language]}</span>
              <span className="hidden sm:inline text-sm font-medium text-gray-700">{languageNames[language]}</span>
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showLangMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border-2 border-gray-200 rounded-lg shadow-lg z-50">
                {languages.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setLanguage(lang);
                      setShowLangMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-rose-50 transition-colors cursor-pointer first:rounded-t-lg last:rounded-b-lg ${
                      language === lang ? 'bg-rose-100 font-semibold text-rose-900' : ''
                    }`}
                  >
                    <span className="text-xl">{languageFlags[lang]}</span>
                    <span className="text-sm text-gray-700">{languageNames[lang]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            {t.landing.title}<br />
            <span className="bg-gradient-to-r from-rose-600 to-amber-600 bg-clip-text text-transparent">{t.landing.titleHighlight}</span><br />
            {t.landing.titleEnd}
          </h2>

          <p className="text-base sm:text-lg md:text-xl text-gray-800 mb-8 md:mb-12 max-w-2xl mx-auto">
            {t.landing.subtitle}
          </p>

          <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href="/guests"
              className="inline-block bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white text-base sm:text-lg md:text-xl font-semibold px-8 sm:px-10 md:px-12 py-3 md:py-4 rounded-full transition-all transform hover:scale-105 shadow-lg shadow-rose-200/50 text-center"
            >
              {t.landing.ctaButton}
            </Link>
            <Link
              href="/seating"
              className="inline-block rounded-full border-2 border-amber-500/90 bg-white px-6 py-3 text-center text-base font-semibold text-rose-800 shadow-md transition-all hover:bg-amber-50/80 sm:px-8 sm:text-lg md:py-4"
            >
              ✨ {t.nav.seating}
            </Link>
          </div>

          {/* Features */}
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mt-12 md:mt-16 lg:mt-20 text-left">
            <div className="bg-white/95 p-6 rounded-xl shadow-md ring-1 ring-rose-100/80">
              <div className="text-3xl mb-3">👥</div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">{t.landing.feature1Title}</h3>
              <p className="text-gray-700">
                {t.landing.feature1Desc}
              </p>
            </div>

            <div className="bg-white/95 p-6 rounded-xl shadow-md ring-1 ring-rose-100/80">
              <div className="text-3xl mb-3">🪑</div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">{t.landing.feature2Title}</h3>
              <p className="text-gray-700">
                {t.landing.feature2Desc}
              </p>
            </div>

            <div className="bg-white/95 p-6 rounded-xl shadow-md ring-1 ring-amber-100/80">
              <div className="text-3xl mb-3">✨</div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">{t.landing.feature3Title}</h3>
              <p className="text-gray-700">
                {t.landing.feature3Desc}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* SEO Content */}
      <section className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="prose prose-lg mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            {t.landing.seoTitle}
          </h2>
          <p className="mb-4 text-gray-800">
            {t.landing.seoText1}
          </p>
          <p className="mb-4 text-gray-800">
            {t.landing.seoText2}
          </p>

          <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            {t.landing.featuresTitle}
          </h3>
          <ul className="list-disc pl-6 space-y-2 text-gray-800">
            <li>{t.landing.feature1}</li>
            <li>{t.landing.feature2}</li>
            <li>{t.landing.feature3}</li>
            <li>{t.landing.feature4}</li>
            <li>{t.landing.feature5}</li>
            <li>{t.landing.feature6}</li>
            <li>{t.landing.feature7}</li>
            <li>{t.landing.feature8}</li>
          </ul>
        </div>
      </section>

      {/* Blog Section */}
      <section className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="rounded-2xl bg-gradient-to-r from-rose-50 via-amber-50/80 to-rose-100/60 p-8 shadow-sm ring-1 ring-rose-100/60 md:p-12">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">📝</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              {t.blog.title}
            </h2>
            <p className="text-lg text-gray-700">
              {t.blog.subtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Link 
              href="/blog/5-wedding-seating-mistakes"
              className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1"
            >
              <div className="text-4xl mb-3">🚫</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t.blog.post1Title}
              </h3>
              <p className="text-gray-700 text-sm mb-3">
                {t.blog.post1Excerpt}
              </p>
              <span className="text-rose-600 font-semibold text-sm">
                {t.blog.readMore}
              </span>
            </Link>

            <Link 
              href="/blog/how-to-arrange-wedding-guests"
              className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1"
            >
              <div className="text-4xl mb-3">😊</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t.blog.post2Title}
              </h3>
              <p className="text-gray-700 text-sm mb-3">
                {t.blog.post2Excerpt}
              </p>
              <span className="text-rose-600 font-semibold text-sm">
                {t.blog.readMore}
              </span>
            </Link>
          </div>

          <div className="text-center">
            <Link 
              href="/blog"
              className="inline-block rounded-lg bg-gradient-to-r from-rose-600 to-rose-700 px-6 py-3 font-semibold text-white shadow-md transition-colors hover:from-rose-700 hover:to-rose-800"
            >
              {t.blog.viewAll}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 text-center text-gray-700">
        <p className="mb-4">{t.landing.footerText}</p>

        <p className="mt-4 text-sm text-gray-600">
          {t.landing.keywordsLabel} {t.landing.keywords}
        </p>
      </footer>
      </div>
    </>
  );
}
