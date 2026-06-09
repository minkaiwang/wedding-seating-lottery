"use client";

import Link from 'next/link';
import Script from 'next/script';
import { COUPLE_NAMES_ZH, SEATING_APP_NAME_EN, SEATING_APP_NAME_ZH } from '@/lib/brand';
import type { Language } from '@/lib/i18n';
import { useApp } from '@/contexts/seating-app';

export default function BlogPost1() {
  const { language } = useApp();

  const getContent = (contents: Partial<Record<Language, string>> & { en: string }) =>
    contents[language] ?? contents.en;

  const pickBody = (blocks: { en: string; hr: string; zh: string }) =>
    language === 'zh' ? blocks.zh : language === 'hr' ? blocks.hr : blocks.en;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "5 Grešaka Pri Rasporedu Gostiju na Venčanju (i Kako Ih Izbeći)",
    "alternativeHeadline": "5 Mistakes When Arranging Wedding Guests (And How to Avoid Them)",
    "description": "Otkrijte 5 najčešćih grešaka koje parovi prave pri rasporedu gostiju na venčanju i kako da ih izbegnete za savršenu atmosferu.",
    "image": "https://weddingseats.app/blog-seating-mistakes.jpg",
    "author": {
      "@type": "Organization",
      "name": COUPLE_NAMES_ZH
    },
    "publisher": {
      "@type": "Organization",
      "name": SEATING_APP_NAME_ZH,
      "logo": {
        "@type": "ImageObject",
        "url": "https://weddingseats.app/icon.svg"
      }
    },
    "datePublished": "2025-10-06",
    "dateModified": "2025-10-06",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://weddingseats.app/blog/5-wedding-seating-mistakes"
    },
    "keywords": ["wedding seating", "seating mistakes", "wedding planning", "guest arrangement", "venčanje", "raspored gostiju"]
  };

  return (
    <>
      <Script
        id="article-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      
      <article className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-600">
        <Link href="/" className="hover:text-rose-600">
          {getContent({ en: 'Home', hr: 'Početna', es: 'Inicio', de: 'Start', fr: 'Accueil', zh: '首页' })}
        </Link>
        {' > '}
        <Link href="/blog" className="hover:text-rose-600">
          {getContent({ en: 'Blog', hr: 'Blog', es: 'Blog', de: 'Blog', fr: 'Blog', zh: '博客' })}
        </Link>
        {' > '}
        <span className="text-gray-900">
          {getContent({
            en: '5 Mistakes When Arranging Wedding Guests',
            hr: '5 Grešaka Pri Rasporedu Gostiju',
            es: '5 Errores al Organizar Mesas de Boda',
            de: '5 Fehler bei der Hochzeitssitzordnung',
            fr: '5 Erreurs dans le Plan de Table de Mariage',
            zh: '婚礼宾客座位五大误区'
          })}
        </span>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {getContent({
            en: '5 Wedding Guest Seating Mistakes (And How to Avoid Them)',
            hr: '5 Grešaka Pri Rasporedu Gostiju na Venčanju (i Kako Ih Izbeći)',
            es: '5 Errores al Organizar Mesas de Boda (Y Cómo Evitarlos)',
            de: '5 Fehler bei der Hochzeitssitzordnung (Und Wie Man Sie Vermeidet)',
            fr: '5 Erreurs dans le Plan de Table de Mariage (Et Comment Les Éviter)',
            zh: '婚礼宾客座位五大常见错误（以及如何避免）'
          })}
        </h1>
        <div className="flex items-center gap-4 text-gray-600">
          <span>📅 {getContent({
            en: 'October 6, 2025',
            hr: '6. oktobar 2025',
            es: '6 de octubre de 2025',
            de: '6. Oktober 2025',
            fr: '6 octobre 2025',
            zh: '2025年10月6日'
          })}</span>
          <span>⏱️ 5 min {getContent({
            en: 'read',
            hr: 'čitanja',
            es: 'lectura',
            de: 'Lesezeit',
            fr: 'lecture',
            zh: '阅读'
          })}</span>
        </div>
      </header>

      {/* Content */}
      <div className="prose prose-lg max-w-none">
        <p className="text-xl text-gray-700 mb-6 leading-relaxed">
          {getContent({
            en: 'Planning wedding seating arrangements can be one of the most challenging parts of preparation. Many couples make the same mistakes that can ruin the atmosphere at the celebration. Here are the five most common mistakes and how to avoid them:',
            hr: 'Planiranje rasporeda sedenja na venčanju može biti jedan od najizazovnijih delova pripreme. Mnogi parovi prave iste greške koje mogu pokvariti atmosferu na svečanosti. Evo pet najčešćih grešaka i kako da ih izbegnete:',
            es: 'Planificar la distribución de asientos en una boda puede ser una de las partes más desafiantes de la preparación. Muchas parejas cometen los mismos errores que pueden arruinar el ambiente de la celebración. Aquí están los cinco errores más comunes y cómo evitarlos:',
            de: 'Die Planung der Hochzeitssitzordnung kann einer der herausforderndsten Teile der Vorbereitung sein. Viele Paare machen die gleichen Fehler, die die Atmosphäre bei der Feier ruinieren können. Hier sind die fünf häufigsten Fehler und wie man sie vermeidet:',
            fr: 'La planification du plan de table de mariage peut être l\'une des parties les plus difficiles de la préparation. De nombreux couples commettent les mêmes erreurs qui peuvent gâcher l\'atmosphère de la célébration. Voici les cinq erreurs les plus courantes et comment les éviter:',
            zh: '婚礼座位安排往往是筹备中最伤脑筋的一环。不少新人会犯同样的错误，影响现场气氛。以下是五大常见误区以及规避方法：'
          })}
        </p>

        {/* Mistake 1 */}
        <section className="mb-8 bg-white rounded-xl p-6 shadow-md border-l-4 border-rose-600">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            1. {getContent({
              en: '🔥 Seating Ex-Partners and Conflicting People Close Together',
              hr: '🔥 Sedenje Bivših Partnera i Ljudi u Konfliktu Blizu',
              es: '🔥 Sentar a Ex-Parejas y Personas en Conflicto Cerca',
              de: '🔥 Ex-Partner und Konfliktparteien Nahe Beieinander Setzen',
              fr: '🔥 Asseoir des Ex-Partenaires et des Personnes en Conflit Près',
              zh: '🔥 把前任或关系紧张的人安排得过近'
            })}
          </h2>
          <p className="text-gray-800 mb-3">
            {pickBody({
              en: 'This is the most common and dangerous mistake. Even if everyone is "mature adults," an awkward situation between exes or people who dislike each other can create tension that will affect the entire atmosphere.',
              hr: 'Ovo je najčešća i najopasanija greška. Čak i ako su svi "odrasli ljudi", neugodna situacija između bivših ili ljudi koji ne vole jedni druge može stvoriti napetost koja će uticati na celokupnu atmosferu.',
              zh: '这是最常见也最危险的做法。即便大家都是「体面成年人」，前任或互相不和的人坐得太近，也会让整场气氛变得尴尬紧绷。'
            })}
          </p>
          <div className="bg-rose-50 rounded-lg p-4">
            <p className="font-semibold text-rose-900 mb-2">
              💡 {getContent({
                en: 'Solution:',
                hr: 'Rešenje:',
                es: 'Solución:',
                de: 'Lösung:',
                fr: 'Solution:',
                zh: '建议：'
              })}
            </p>
            <p className="text-gray-800">
              {pickBody({
                en: `Make a list of people who don't get along or would be uncomfortable sitting together. Use ${SEATING_APP_NAME_EN} to visually separate these people - ideally in different parts of the room, not just at different tables.`,
                hr: `Napravite listu ljudi koji se ne slažu ili bi im bilo neprijatno da sede zajedno. Koristite ${SEATING_APP_NAME_EN} da vizuelno razdvojite ove osobe - idealno na različite delove sale, ne samo na različite stolove.`,
                zh: `先列出不宜同桌或不宜靠近的人员名单。用 ${SEATING_APP_NAME_ZH} 在平面图上把他们隔开——最好分在场地两侧，而不仅仅是不同桌。`
              })}
            </p>
          </div>
        </section>

        {/* Mistake 2 */}
        <section className="mb-8 bg-white rounded-xl p-6 shadow-md border-l-4 border-blue-600">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            2. {getContent({
              en: '👤 Leaving People Who Don\'t Know Anyone Alone',
              hr: '👤 Ostavljanje Ljudi Koji Ne Poznaju Nikoga Sami',
              es: '👤 Dejar Solo a Quien No Conoce a Nadie',
              de: '👤 Menschen Alleinzulassen, Die Niemanden Kennen',
              fr: '👤 Laisser Seuls Ceux Qui Ne Connaissent Personne',
              zh: '👤 让「谁也不认识」的客人独自坐一桌陌生人中间'
            })}
          </h2>
          <p className="text-gray-800 mb-3">
            {pickBody({
              en: 'Placing someone who doesn\'t know other guests at a table with complete strangers without any "bridge" can result in a quiet, awkward table where no one talks.',
              hr: 'Postaviti nekoga ko ne poznaje druge goste za sto sa potpunim strancima bez ikakvog "mosta" može rezultirati tihim, nezgodnim stolom gde niko ne razgovara.',
              zh: '若客人完全不认识同桌其他人，又缺少能活络气氛的「桥梁」人物，整桌容易冷场、尴尬。'
            })}
          </p>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="font-semibold text-blue-900 mb-2">
              💡 {getContent({ en: 'Solution:', hr: 'Rešenje:', es: 'Solución:', de: 'Lösung:', fr: 'Solution:', zh: '建议：' })}
            </p>
            <p className="text-gray-800">
              {pickBody({
                en: `Always seat "lonely" guests with people who are social and friendly. You can use tags in ${SEATING_APP_NAME_EN} (e.g., "social," "extrovert") to identify the best candidates who will help new people feel welcome.`,
                hr: `Uvek sedite "usamljene" goste sa ljudima koji su društveni i prijateljski nastrojeni. Možete koristiti tagove u ${SEATING_APP_NAME_EN} (npr. "društveni", "ekstrovert") da identifikujete najbolje kandidate koji će pomoći novim ljudima da se osećaju dobrodošlo.`,
                zh: `尽量把「落单」客人安排到热情健谈的人旁边。可在 ${SEATING_APP_NAME_ZH} 里用标签（如「外向」「社牛」）标出适合带动气氛的宾客。`
              })}
            </p>
          </div>
        </section>

        {/* Mistake 3 */}
        <section className="mb-8 bg-white rounded-xl p-6 shadow-md border-l-4 border-green-600">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            3. {getContent({
              en: '🪑 Assuming Round Tables Will Automatically Solve Everything',
              hr: '🪑 Pretpostavljanje Da Će Okrugli Stolovi Automatski Rešiti Sve',
              es: '🪑 Pensar Que Las Mesas Redondas Lo Arreglan Todo',
              de: '🪑 Annehmen, Runde Tische Lösen Alles Automatisch',
              fr: '🪑 Croire Que Les Tables Rondes Règlent Tout',
              zh: '🪑 以为用了圆桌就万事大吉'
            })}
          </h2>
          <p className="text-gray-800 mb-3">
            {pickBody({
              en: 'Many couples choose round tables thinking they will automatically create a better atmosphere. However, for tables with more than 8-10 people, conversation across the table becomes difficult and "mini groups" often form.',
              hr: 'Mnogi parovi biraju okrugle stolove misleći da će automatski stvoriti bolju atmosferu. Međutim, za stolove sa više od 8-10 ljudi, razgovor preko stola postaje težak i često se formiraju "mini grupe".',
              zh: '很多人以为圆桌更有气氛，但一桌超过 8～10 人时，跨桌交流会变难，反而容易形成几个「小圈子」。'
            })}
          </p>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="font-semibold text-green-900 mb-2">
              💡 {getContent({ en: 'Solution:', hr: 'Rešenje:', es: 'Solución:', de: 'Lösung:', fr: 'Solution:', zh: '建议：' })}
            </p>
            <p className="text-gray-800">
              {pickBody({
                en: `Use different table sizes as needed. For large groups of friends, long tables might be better. For mixed groups, smaller round tables (6-8 people) allow everyone to talk. ${SEATING_APP_NAME_EN} lets you test different arrangements before deciding.`,
                hr: `Koristite različite veličine stolova prema potrebi. Za velike grupe prijatelja, možda su dugački stolovi bolji. Za mešovite grupe, manji okrugli stolovi (6-8 ljudi) omogućavaju svima da razgovaraju. ${SEATING_APP_NAME_EN} vam omogućava da testirate različite rasporede pre nego što se odlučite.`,
                zh: `按人数与人群混搭程度选桌型与桌长：好友大团体可考虑长条桌；混合宾客可用 6～8 人的小圆桌。用 ${SEATING_APP_NAME_ZH} 多试几种摆法再定稿。`
              })}
            </p>
          </div>
        </section>

        {/* Mistake 4 */}
        <section className="mb-8 bg-white rounded-xl p-6 shadow-md border-l-4 border-yellow-600">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            4. {getContent({
              en: '👶 Forgetting About Children and Their Parents',
              hr: '👶 Zaboravljanje Na Decu i Njihove Roditelje',
              es: '👶 Olvidar a Los Niños y a Sus Padres',
              de: '👶 Kinder Und Deren Eltern Zu Vergessen',
              fr: '👶 Oublier Les Enfants Et Leurs Parents',
              zh: '👶 忽略儿童与家长的需求'
            })}
          </h2>
          <p className="text-gray-800 mb-3">
            {pickBody({
              en: 'Seating children too far from parents or creating a "kids\' table" without supervision can create stress for both parents and children. On the other hand, seating young children right next to the music or dance floor is also a bad idea.',
              hr: 'Sedenje dece predaleko od roditelja ili stvaranje "dečjeg stola" bez supervizije može stvoriti stres i za roditelje i za decu. S druge strane, sedenje male dece direktno uz muziku ili plesu je takođe loša ideja.',
              zh: '孩子坐得离父母太远，或设「儿童桌」却无人照看，家长和孩子都累。幼儿紧挨音响或舞池也不是好选择。'
            })}
          </p>
          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="font-semibold text-yellow-900 mb-2">
              💡 {getContent({ en: 'Solution:', hr: 'Rešenje:', es: 'Solución:', de: 'Lösung:', fr: 'Solution:', zh: '建议：' })}
            </p>
            <p className="text-gray-800">
              {pickBody({
                en: 'Seat young children (under 10) with parents or in close proximity where parents can supervise. For older children and teenagers, a "kids\' table" can be fun, but position it where parents can monitor. Also, avoid positions near speakers or the kitchen.',
                hr: 'Sedite malu decu (ispod 10 godina) sa roditeljima ili u neposrednoj blizini gde roditelji mogu da nadziru. Za stariju decu i tinejdžere, "dečji sto" može biti zabavan, ali ga pozicionirajte gde roditelji mogu pratiti. Takođe, izbegnite pozicije blizu zvučnika ili kuhinje.',
                zh: '10 岁以下幼儿尽量与父母同桌或紧邻；大龄儿童与青少年可以单独一桌，但要放在家长视线可及处，并避开喇叭与传菜口。'
              })}
            </p>
          </div>
        </section>

        {/* Mistake 5 */}
        <section className="mb-8 bg-white rounded-xl p-6 shadow-md border-l-4 border-red-600">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            5. {getContent({
              en: '⏰ Waiting Until the Last Minute',
              hr: '⏰ Čekanje Do Poslednjeg Trenutka',
              es: '⏰ Dejar Todo Para Última Hora',
              de: '⏰ Bis Zur Letzten Minute Warten',
              fr: '⏰ Attendre La Dernière Minute',
              zh: '⏰ 拖到最后一刻才排座'
            })}
          </h2>
          <p className="text-gray-800 mb-3">
            {pickBody({
              en: 'Perhaps the worst mistake of all - doing the seating arrangement a week before the wedding. This puts you under enormous pressure and leaves no time for adjustments when guests cancel or confirm at the last minute.',
              hr: 'Možda najgora greška od svih - raditi raspored sedenja nedelju dana pre venčanja. Ovo vas stavlja pod ogroman pritisak i ne ostavlja vremena za prilagođavanja kada se gosti odjave ili potvrde u poslednjem trenutku.',
              zh: '婚礼前一周才匆忙排座是最被动的——临时有人缺席或加人，你会完全没有缓冲调整。'
            })}
          </p>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="font-semibold text-red-900 mb-2">
              💡 {getContent({ en: 'Solution:', hr: 'Rešenje:', es: 'Solución:', de: 'Lösung:', fr: 'Solution:', zh: '建议：' })}
            </p>
            <p className="text-gray-800">
              {pickBody({
                en: `Start planning seating arrangements as soon as you receive most confirmations - ideally 3-4 weeks before the wedding. Use digital tools like ${SEATING_APP_NAME_EN} where you can easily move people as you get new information. Make the final arrangement 5-7 days before the event, leaving room for small changes.`,
                hr: `Započnite planiranje rasporeda sedenja čim dobijete većinu potvrda - idealno 3-4 nedelje pre venčanja. Koristite digitalne alate poput ${SEATING_APP_NAME_EN} gde možete lako pomeriti ljude kako dobijate nove informacije. Napravite finalni raspored 5-7 dana pre događaja, ostavljajući prostor za male izmene.`,
                zh: `多数宾客确认后即可开始排座，理想情况是婚前 3～4 周起稿。用 ${SEATING_APP_NAME_ZH} 随时拖拽更新；正式版建议在婚前 5～7 天冻结，仍预留微调空间。`
              })}
            </p>
          </div>
        </section>

        {/* Conclusion */}
        <section className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            ✅ {getContent({
              en: 'Conclusion',
              hr: 'Zaključak',
              es: 'Conclusión',
              de: 'Fazit',
              fr: 'Conclusion',
              zh: '结语'
            })}
          </h2>
          <p className="text-gray-800 mb-4">
            {pickBody({
              en: 'Seating arrangement is one of the most important components of a successful wedding. By avoiding these five mistakes, you\'re already on your way to creating a pleasant atmosphere where all your guests will enjoy.',
              hr: 'Raspored sedenja je jedna od najvažnijih komponenti uspešnog venčanja. Izbegavanjem ovih pet grešaka, već ste na dobrom putu ka stvaranju prijatne atmosfere gde će svi vaši gosti uživati.',
              zh: '座位安排是圆满婚礼的重要一环。避开这五个误区，你就已经为营造轻松融洽的现场打下了基础。'
            })}
          </p>
          <p className="text-gray-800 mb-4">
            {pickBody({
              en: 'Remember: good planning isn\'t just about logistics - it\'s about caring for your guests and ensuring everyone feels valued and included in your special day.',
              hr: 'Zapamtite: dobro planiranje nije samo o logistici - radi se o brizi za vaše goste i osiguravanju da se svi osećaju cenjeno i uključeno u vaš poseban dan.',
              zh: '请记住：好的安排不只是「摆桌子」，更是照顾好宾客的感受，让每位来宾都感到被重视、被欢迎。'
            })}
          </p>
        </section>

        {/* CTA */}
        <div className="wedding-cta-block rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold mb-3">
            {getContent({
              en: 'Ready to Start Planning?',
              hr: 'Spremni za Planiranje?',
              es: '¿Listo para Comenzar a Planificar?',
              de: 'Bereit für die Planung?',
              fr: 'Prêt à Commencer la Planification?',
              zh: '准备好开始排座了吗？'
            })}
          </h3>
          <p className="mb-6">
            {getContent({
              en: 'Use our free tool to create the perfect seating arrangement for your wedding.',
              hr: 'Koristite naš besplatni alat da napravite savršen raspored sedenja za vaše venčanje.',
              es: 'Use nuestra herramienta gratuita para crear la disposición perfecta de asientos para su boda.',
              de: 'Nutzen Sie unser kostenloses Tool, um die perfekte Sitzordnung für Ihre Hochzeit zu erstellen.',
              fr: 'Utilisez notre outil gratuit pour créer le plan de table parfait pour votre mariage.',
              zh: '使用我们的免费工具，为你的婚礼拖出一张稳妥的座位表。'
            })}
          </p>
          <Link
            href="/guests"
            className="inline-block bg-white text-rose-600 font-bold px-8 py-3 rounded-full hover:bg-gray-100 transition-colors"
          >
            {getContent({
              en: 'Start Now - Free',
              hr: 'Počnite Sada - Besplatno',
              es: 'Comenzar Ahora - Gratis',
              de: 'Jetzt Starten - Kostenlos',
              fr: 'Commencer Maintenant - Gratuit',
              zh: '免费开始'
            })}
          </Link>
        </div>
      </div>

      {/* Related Articles */}
      <aside className="mt-12 border-t pt-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          {getContent({
            en: 'Related Articles',
            hr: 'Povezani Članci',
            es: 'Artículos Relacionados',
            de: 'Verwandte Artikel',
            fr: 'Articles Connexes',
            zh: '相关文章'
          })}
        </h3>
        <Link
          href="/blog/how-to-arrange-wedding-guests"
          className="block bg-white rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">😊</span>
            <div>
              <h4 className="font-semibold text-gray-900 hover:text-rose-600">
                {getContent({
                  en: 'How to Arrange Guests So Everyone Is Happy',
                  hr: 'Kako Rasporediti Goste Da Svi Budu Srećni',
                  es: 'Cómo Organizar a los Invitados Para Que Todos Sean Felices',
                  de: 'So Ordnen Sie Gäste An, Damit Alle Glücklich Sind',
                  fr: 'Comment Organiser les Invités Pour Que Tout le Monde Soit Heureux',
                  zh: '怎样排座让大家皆大欢喜'
                })}
              </h4>
              <p className="text-sm text-gray-600">
                {getContent({
                  en: 'Practical guide to creating the ideal arrangement',
                  hr: 'Praktični vodič za kreiranje idealnog rasporeda',
                  es: 'Guía práctica para crear la disposición ideal',
                  de: 'Praktischer Leitfaden zur Erstellung der idealen Anordnung',
                  fr: 'Guide pratique pour créer la disposition idéale',
                  zh: '实用指南：搭一版稳妥又有温度的座位方案'
                })}
              </p>
            </div>
          </div>
        </Link>
      </aside>
    </article>
    </>
  );
}

