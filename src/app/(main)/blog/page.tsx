"use client";

import Link from 'next/link';
import { useApp } from '@/contexts/seating-app';

export default function BlogPage() {
  const { t } = useApp();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          📝 {t.blog.title}
        </h1>
        <p className="text-lg text-gray-700">
          {t.blog.subtitle}
        </p>
      </div>

      <div className="space-y-6">
        <article className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200">
          <Link href="/blog/5-wedding-seating-mistakes" className="block group">
            <div className="flex items-start gap-4">
              <div className="text-4xl">🚫</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-rose-600 transition-colors">
                  {t.blog.post1Title}
                </h2>
                <p className="text-gray-700 mb-3">
                  {t.blog.post1Excerpt}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>📅 2025-10-06</span>
                  <span>⏱️ 5 min</span>
                </div>
                <div className="mt-3 text-rose-600 font-semibold group-hover:underline">
                  {t.blog.readMore}
                </div>
              </div>
            </div>
          </Link>
        </article>

        <article className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200">
          <Link href="/blog/how-to-arrange-wedding-guests" className="block group">
            <div className="flex items-start gap-4">
              <div className="text-4xl">😊</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-rose-600 transition-colors">
                  {t.blog.post2Title}
                </h2>
                <p className="text-gray-700 mb-3">
                  {t.blog.post2Excerpt}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>📅 2025-10-07</span>
                  <span>⏱️ 7 min</span>
                </div>
                <div className="mt-3 text-rose-600 font-semibold group-hover:underline">
                  {t.blog.readMore}
                </div>
              </div>
            </div>
          </Link>
        </article>
      </div>

      {/* SEO Content */}
      <section className="mt-12 bg-rose-50 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {t.blog.seoTitle}
        </h2>
        <p className="text-gray-800 mb-4">
          {t.blog.seoText1}
        </p>
        <p className="text-gray-800">
          {t.blog.seoText2}
        </p>
      </section>
    </div>
  );
}

