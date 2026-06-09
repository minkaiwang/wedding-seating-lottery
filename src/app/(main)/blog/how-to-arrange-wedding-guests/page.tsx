"use client";

import Link from 'next/link';
import Script from 'next/script';
import { COUPLE_NAMES_ZH, SEATING_APP_NAME_EN, SEATING_APP_NAME_ZH } from '@/lib/brand';
import type { Language } from '@/lib/i18n';
import { useApp } from '@/contexts/seating-app';

export default function BlogPost2() {
  const { language } = useApp();

  const getContent = (contents: Partial<Record<Language, string>> & { en: string }) =>
    contents[language] ?? contents.en;

  /** Localized body text (EN / Hrvatski / 中文); other UI languages fall back to English */
  const pickBody = (blocks: { en: string; hr: string; zh: string }) =>
    language === 'zh' ? blocks.zh : language === 'hr' ? blocks.hr : blocks.en;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "Kako Rasporediti Goste Da Svi Budu Srećni: Potpuni Vodič",
    "alternativeHeadline": "How to Arrange Wedding Guests So Everyone Is Happy: Complete Guide",
    "description": "Kompletni vodič za kreiranje idealnog rasporeda sedenja na venčanju. Naučite kako grupisati goste, balansirati stolove i stvoriti atmosferu u kojoj će svi uživati.",
    "image": "https://weddingseats.app/blog-happy-guests.jpg",
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
    "datePublished": "2025-10-07",
    "dateModified": "2025-10-07",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://weddingseats.app/blog/how-to-arrange-wedding-guests"
    },
    "keywords": ["wedding seating guide", "happy guests", "seating arrangement", "wedding planning", "guest arrangement", "venčanje", "srećni gosti"]
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
            en: 'How to Arrange Guests',
            hr: 'Kako Rasporediti Goste',
            es: 'Cómo Organizar Invitados',
            de: 'Gäste Anordnen',
            fr: 'Comment Organiser les Invités',
            zh: '怎样安排宾客'
          })}
        </span>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <div className="text-6xl mb-4">😊</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {getContent({
            en: 'How to Arrange Wedding Guests So Everyone Is Happy: Complete Guide',
            hr: 'Kako Rasporediti Goste Da Svi Budu Srećni: Potpuni Vodič',
            es: 'Cómo Organizar a los Invitados Para Que Todos Sean Felices: Guía Completa',
            de: 'So Ordnen Sie Hochzeitsgäste An, Damit Alle Glücklich Sind: Vollständiger Leitfaden',
            fr: 'Comment Organiser les Invités Pour Que Tout le Monde Soit Heureux: Guide Complet',
            zh: '婚礼宾客怎么排才皆大欢喜：完整指南'
          })}
        </h1>
        <div className="flex items-center gap-4 text-gray-600">
          <span>📅 {getContent({
            en: 'October 7, 2025',
            hr: '7. oktobar 2025',
            es: '7 de octubre de 2025',
            de: '7. Oktober 2025',
            fr: '7 octobre 2025',
            zh: '2025年10月7日'
          })}</span>
          <span>⏱️ 7 min {getContent({
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
          {pickBody({
            en: 'Creating a seating arrangement that will satisfy all guests is an art that requires careful planning, empathy, and understanding of the dynamics between different groups of people. Here\'s your complete guide to the perfect arrangement:',
            hr: 'Kreiranje rasporeda sedenja koji će zadovoljiti sve goste je umetnost koja zahteva pažljivo planiranje, empatiju i razumevanje dinamike između različitih grupa ljudi. Evo vašeg kompletnog vodiča za savršen raspored:',
            zh: '既要让每位宾客都自在，又要兼顾人情与动线——这就是排座的学问。下面这份完整指南帮你一步步搭出稳妥又有温度的座位方案。'
          })}
        </p>

        {/* Introduction */}
        <section className="mb-8 bg-gradient-to-r from-blue-50 to-rose-50 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            🎯 {pickBody({ en: 'Basic Principles', hr: 'Osnovna Načela', zh: '三条基本原则' })}
          </h2>
          <p className="text-gray-800 mb-3">
            {pickBody({
              en: 'Before you start planning, it\'s important to understand three basic principles of successful seating:',
              hr: 'Pre nego što počnete sa planiranjem, važno je razumeti tri osnovna principa uspešnog rasporeda sedenja:',
              zh: '动手前先记住三件事：'
            })}
          </p>
          <ul className="space-y-2 text-gray-800">
            <li className="flex items-start gap-2">
              <span>✓</span>
              <span>
                <strong>{pickBody({ en: 'Compatibility', hr: 'Kompatibilnost', zh: '投缘' })}：</strong>{' '}
                {pickBody({
                  en: 'Seat people who have common interests or experiences',
                  hr: 'Sedite ljude koji imaju zajedničke interese ili iskustva',
                  zh: '尽量让有共同话题、相似背景的人邻座。'
                })}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span>✓</span>
              <span>
                <strong>{pickBody({ en: 'Balance', hr: 'Balans', zh: '动静搭配' })}：</strong>{' '}
                {pickBody({
                  en: 'Mix introverts with extroverts',
                  hr: 'Mešajte introverte sa ekstrovertima',
                  zh: '内向与外向宾客混搭，避免一整桌都沉默或都抢话。'
                })}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span>✓</span>
              <span>
                <strong>{pickBody({ en: 'Strategy', hr: 'Strategija', zh: '动线与区位' })}：</strong>{' '}
                {pickBody({
                  en: 'Think about table locations in the space',
                  hr: 'Razmislite o lokaciji stolova u prostoru',
                  zh: '音响、出入口、舞池、传菜口都会影响体验，排桌位和排座位同样重要。'
                })}
              </span>
            </li>
          </ul>
        </section>

        {/* Step 1 */}
        <section className="mb-8 bg-white rounded-xl p-6 shadow-md border-l-4 border-rose-600">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            1️⃣ {pickBody({ en: 'Categorize Your Guests', hr: 'Kategorišite Svoje Goste', zh: '先给宾客分组' })}
          </h2>
          <p className="text-gray-800 mb-4">
            {pickBody({
              en: 'The first step is to divide your guests into logical groups. This helps you see the bigger picture and makes decision-making easier:',
              hr: 'Prvi korak je da podelite svoje goste u logične grupe. Ovo vam pomaže da vidite širu sliku i olakšava odlučivanje:',
              zh: '先把宾客分成清晰的圈层：有助于一眼看清「谁该和谁坐得更近」。'
            })}
          </p>
          
          <div className="space-y-4">
            <div className="bg-rose-50 rounded-lg p-4">
              <h3 className="font-bold text-rose-900 mb-2">
                👨‍👩‍👧‍👦 {pickBody({ en: 'Family', hr: 'Porodica', zh: '家人与亲戚' })}
              </h3>
              <p className="text-gray-800 text-sm">
                {pickBody({
                  en: 'Close family (parents, grandparents, siblings), extended family, family with children',
                  hr: 'Bliska porodica (roditelji, bake i deke, braća i sestre), dalja rodbina, rodbina sa decom',
                  zh: '父母辈、祖辈、兄弟姐妹；远亲；带娃家庭——长辈与晚辈的需求往往不同，后面排桌时要分层考虑。'
                })}
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-bold text-blue-900 mb-2">
                👥 {pickBody({ en: 'Friends', hr: 'Prijatelji', zh: '朋友圈' })}
              </h3>
              <p className="text-gray-800 text-sm">
                {pickBody({
                  en: 'Best friends, college/work friends, childhood friends, friends who don\'t know others',
                  hr: 'Najbliži prijatelji, prijatelji sa fakulteta/posla, prijatelji iz detinjstva, prijatelji koji ne poznaju druge',
                  zh: '死党、同学/同事圈、发小；其中若有「谁也不认识」的单独访客，后面要特别安排桥梁人物。'
                })}
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-bold text-green-900 mb-2">
                💼 {pickBody({ en: 'Colleagues and Business Contacts', hr: 'Kolege i Poslovni Kontakti', zh: '同事与商务来宾' })}
              </h3>
              <p className="text-gray-800 text-sm">
                {pickBody({
                  en: 'Current colleagues, former colleagues, business partners',
                  hr: 'Kolege sa trenutnog posla, bivše kolege, poslovni partneri',
                  zh: '现任同事、前同事、合作伙伴——可考虑安排在相对安静、便于交谈的一侧。'
                })}
              </p>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4">
              <h3 className="font-bold text-yellow-900 mb-2">
                🌟 {pickBody({ en: 'VIP Guests', hr: 'VIP Gosti', zh: '贵宾与特殊关照' })}
              </h3>
              <p className="text-gray-800 text-sm">
                {pickBody({
                  en: 'Best man/maid of honor, elderly guests, guests with special needs, important people in your lives',
                  hr: 'Kum/kuma, starija lica, gosti sa posebnim potrebama, važne osobe u vašim životima',
                  zh: '伴郎伴娘、长辈、行动不便或有饮食禁忌的宾客，以及对你意义重大的师长亲友——座位越周到，现场越省心。'
                })}
              </p>
            </div>
          </div>

          <div className="mt-4 bg-white border-2 border-rose-200 rounded-lg p-4">
            <p className="font-semibold text-rose-900 mb-2">
              💡 {pickBody({
                en: `${SEATING_APP_NAME_EN} `,
                hr: `${SEATING_APP_NAME_EN} `,
                zh: `${SEATING_APP_NAME_ZH} `,
              })}{pickBody({ en: 'Tip:', hr: 'Savet:', zh: '提示：' })}
            </p>
            <p className="text-gray-800 text-sm">
              {pickBody({
                en: 'In our app, you can add tags to each guest (e.g., "family," "best friends," "work"). This allows you to quickly filter and group guests when creating arrangements.',
                hr: 'U našoj aplikaciji možete dodati tagove svakom gostu (npr. "porodica", "najbolji prijatelji", "posao"). Ovo vam omogućava da brzo filtrirate i grupišete goste pri pravljenju rasporeda.',
                zh: `在 ${SEATING_APP_NAME_ZH} 里可为每位宾客打标签（如「女方亲友」「同事」「素食」），排座时筛选、拖拽都会快很多。`
              })}
            </p>
          </div>
        </section>

        {/* Step 2 */}
        <section className="mb-8 bg-white rounded-xl p-6 shadow-md border-l-4 border-blue-600">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            2️⃣ {pickBody({
              en: 'Identify "Bridges" Between Groups',
              hr: 'Identifikujte "Mostove" Između Grupa',
              zh: '找出圈层之间的「桥梁」人物'
            })}
          </h2>
          <p className="text-gray-800 mb-4">
            {pickBody({
              en: '"Bridges" are people who know guests from different groups. They are key to successful arrangements as they help connect people:',
              hr: '"Mostovi" su ljudi koji poznaju goste iz različitih grupa. Oni su ključni za uspešan raspored jer pomažu u povezivanju ljudi:',
              zh: '「桥梁」指的是同时熟悉两个圈层的人——他们能自然破冰，让不熟的人也能聊起来。'
            })}
          </p>
          
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <h3 className="font-bold text-blue-900 mb-3">
              {pickBody({ en: 'Examples of "bridges":', hr: 'Primeri "mostova":', zh: '典型的桥梁角色：' })}
            </h3>
            <ul className="space-y-2 text-gray-800">
              <li>
                •{' '}
                {pickBody({
                  en: 'Friend who knows both your family and college friends',
                  hr: 'Prijatelj koji poznaje i vašu porodicu i prijatelje sa fakulteta',
                  zh: '既认识你家人又认识你老同学的朋友'
                })}
              </li>
              <li>
                •{' '}
                {pickBody({
                  en: 'Relative who is equally close to both families (yours and your partner\'s)',
                  hr: 'Rođak koji je isto tako blizak sa obe porodice (vaša i partnerova)',
                  zh: '与双方家里都走得近的亲戚'
                })}
              </li>
              <li>
                •{' '}
                {pickBody({
                  en: 'Social person who easily starts conversations with strangers',
                  hr: 'Društvena osoba koja lako započinje razgovore sa strancima',
                  zh: '外向健谈、擅长照顾场面的人'
                })}
              </li>
              <li>
                •{' '}
                {pickBody({
                  en: 'Old friend who knows many of your other friends',
                  hr: 'Stari prijatelj koji poznaje mnoge od vaših drugih prijatelja',
                  zh: '认识你朋友圈里大多数人的老友'
                })}
              </li>
            </ul>
          </div>

          <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
            <p className="font-semibold text-blue-900 mb-2">
              🎯 {pickBody({ en: 'Strategy:', hr: 'Strategija:', zh: '策略：' })}
            </p>
            <p className="text-gray-800">
              {pickBody({
                en: 'Use "bridges" to connect different groups. If you need to seat people who don\'t know each other, place a "bridge" with them to start conversations and create a pleasant atmosphere.',
                hr: 'Koristite "mostove" da povežete različite grupe. Ako morate da sedite ljude koji se ne poznaju, stavite "most" sa njima da započne razgovore i stvori prijatnu atmosferu.',
                zh: '需要混搭陌生圈层时，尽量把桥梁人物安排在桌上或相邻桌；必要时让 TA 坐在两组人中间，话题更容易自然展开。'
              })}
            </p>
          </div>
        </section>

        {/* Step 3 */}
        <section className="mb-8 bg-white rounded-xl p-6 shadow-md border-l-4 border-green-600">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            3️⃣ {pickBody({ en: 'Plan Table Positions', hr: 'Planirajte Pozicije Stolova', zh: '规划桌子在场地里的位置' })}
          </h2>
          <p className="text-gray-800 mb-4">
            {pickBody({
              en: 'The location of each table in the space is just as important as who sits at it:',
              hr: 'Lokacija svakog stola u prostoru je jednako važna kao i to ko sedi za njim:',
              zh: '桌子摆在哪里，和「谁坐哪一桌」同样重要：'
            })}
          </p>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-green-50 rounded-lg p-3">
              <span className="text-2xl">⭐</span>
              <div>
                <h4 className="font-bold text-green-900">
                  {pickBody({
                    en: 'Main Table (if you have one)',
                    hr: 'Glavni Sto (ako ga imate)',
                    zh: '主桌 / 新人桌（若有）'
                  })}
                </h4>
                <p className="text-gray-800 text-sm">
                  {pickBody({
                    en: 'Close family, best man/maid of honor, perhaps closest friends. Central position with a good view of everything.',
                    hr: 'Bliska porodica, kum/kuma, možda najbliži prijatelji. Centralna pozicija sa dobrim pogledom na sve.',
                    zh: '至亲、伴郎伴娘与好友代表；宜放在视野开阔、动线顺的核心区域。'
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-rose-50 rounded-lg p-3">
              <span className="text-2xl">👴</span>
              <div>
                <h4 className="font-bold text-rose-900">
                  {pickBody({
                    en: 'Elderly and Guests with Special Needs',
                    hr: 'Starije Osobe i Gosti sa Posebnim Potrebama',
                    zh: '长辈与需要关照的宾客'
                  })}
                </h4>
                <p className="text-gray-800 text-sm">
                  {pickBody({
                    en: 'Close to exits, away from speakers and music, easy bathroom access. Avoid crowds and high-traffic areas.',
                    hr: 'Blizu izlaza, dalje od zvučnika i muzike, lako dostupni toaleti. Izbegnite gužve i prolaznička mesta.',
                    zh: '靠近出入口、远离低音炮与灯架动线；洗手间要好走，避开传菜通道与拥挤拐角。'
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-yellow-50 rounded-lg p-3">
              <span className="text-2xl">🎵</span>
              <div>
                <h4 className="font-bold text-yellow-900">
                  {pickBody({ en: 'Young People and Party Crowd', hr: 'Mladi i Zabavna Ekipa', zh: '爱热闹的年轻朋友' })}
                </h4>
                <p className="text-gray-800 text-sm">
                  {pickBody({
                    en: 'Close to the dance floor and music. These guests will enjoy the energetic atmosphere the most and will be first on the dance floor.',
                    hr: 'Blizu plesa i muzike. Ovi gosti će najviše uživati u energičnoj atmosferi i biće prvi na plesnom podijumu.',
                    zh: '可靠近舞池与音响——他们通常是气氛担当，但也注意别把长辈桌夹在音响正对面。'
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-blue-50 rounded-lg p-3">
              <span className="text-2xl">👨‍💼</span>
              <div>
                <h4 className="font-bold text-blue-900">
                  {pickBody({ en: 'Business Guests', hr: 'Poslovni Gosti', zh: '商务宾客' })}
                </h4>
                <p className="text-gray-800 text-sm">
                  {pickBody({
                    en: 'Quiet zone where they can talk. Maybe with a nice view, but away from the loudest parts of the room.',
                    hr: 'Tiha zona gde mogu da razgovaraju. Možda sa lepim pogledom, ali dalje od najglasnijih delova sale.',
                    zh: '相对安静、方便交谈的一侧；若窗外景观好更佳，但务必远离音响啸叫区。'
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-pink-50 rounded-lg p-3">
              <span className="text-2xl">👶</span>
              <div>
                <h4 className="font-bold text-pink-900">
                  {pickBody({ en: 'Families with Children', hr: 'Porodice sa Decom', zh: '带娃家庭' })}
                </h4>
                <p className="text-gray-800 text-sm">
                  {pickBody({
                    en: 'Close to exits for easy access when children need a break. Ideally with a bit more space between tables for strollers or play.',
                    hr: 'Blizu izlaza za lak pristup kada deci treba pauza. Idealno sa malo više prostora između stolova za kolica ili igru.',
                    zh: '靠近侧门方便带孩子出去透气；桌间距略宽更友好，婴儿车也有转弯空间。'
                  })}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Step 4 */}
        <section className="mb-8 bg-white rounded-xl p-6 shadow-md border-l-4 border-yellow-600">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            4️⃣ {pickBody({ en: 'Rules for Balancing Tables', hr: 'Pravila za Balansiranje Stolova', zh: '平衡每一桌的气氛' })}
          </h2>
          <p className="text-gray-800 mb-4">
            {pickBody({
              en: 'Each table should be a microcosm of good energy. Here\'s how to achieve that:',
              hr: 'Svaki sto treba da bude mikrokosmos dobre energije. Evo kako to postići:',
              zh: '每一桌都像一个小气场——可以这样调配：'
            })}
          </p>
          
          <div className="space-y-4">
            <div className="bg-yellow-50 rounded-lg p-4">
              <h3 className="font-bold text-yellow-900 mb-2">
                ⚖️ {pickBody({ en: 'Personality Balance', hr: 'Balans Ličnosti', zh: '性格混搭' })}
              </h3>
              <p className="text-gray-800 mb-2">
                {pickBody({
                  en: 'Don\'t seat all quiet people together or all loud people together. An ideal table has:',
                  hr: 'Ne sedite sve tihte ljude zajedno ili sve glasne ljude zajedno. Idealan sto ima:',
                  zh: '不要把所有内向或外向的人各堆一桌，比较理想的组合是：'
                })}
              </p>
              <ul className="text-gray-700 text-sm space-y-1 ml-4">
                <li>
                  • 2-3{' '}
                  {pickBody({
                    en: 'extroverts who start conversations',
                    hr: 'ekstroverta koji pokreću razgovore',
                    zh: '能抛话题、热场的人'
                  })}
                </li>
                <li>
                  • 2-3{' '}
                  {pickBody({
                    en: 'good listeners',
                    hr: 'dobrih slušalaca',
                    zh: '善于倾听、接话的人'
                  })}
                </li>
                <li>
                  • 2-3{' '}
                  {pickBody({
                    en: 'people who are somewhere in between',
                    hr: 'ljudi koji su negde između',
                    zh: '性格居中、能照顾全场节奏的人'
                  })}
                </li>
              </ul>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <h3 className="font-bold text-orange-900 mb-2">
                🎭 {pickBody({ en: 'Generation Balance', hr: 'Balans Generacija', zh: '年龄层次' })}
              </h3>
              <p className="text-gray-800 text-sm">
                {pickBody({
                  en: 'Mixing generations can be great, but be careful: don\'t seat one 70-year-old with a table full of 25-year-olds. Try to have at least 2-3 people of similar ages at each table.',
                  hr: 'Mešanje generacija može biti odlično, ali pazite: ne sedite jednu osobu od 70 godina sa stolom punim ljudi od 25. Pokušajte da imate barem 2-3 osobe sličnih godina za svakim stolom.',
                  zh: '跨代同乐很有温度，但别让一位长辈单独落在全是年轻人的一桌；每桌尽量有 2～3 位年龄相近的同伴更自在。'
                })}
              </p>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <h3 className="font-bold text-red-900 mb-2">
                💑 {pickBody({ en: 'Couples', hr: 'Parovi', zh: '情侣与单身' })}
              </h3>
              <p className="text-gray-800 text-sm">
                {pickBody({
                  en: 'Seat couples together, but don\'t isolate them. Mix several couples with singles so you don\'t create a "couples vs. singles" dynamic. Also, avoid seating all newly dating couples at one table - it can be awkward.',
                  hr: 'Sedite parove zajedno, ali ih nemojte izolovati. Mešajte više parova sa singlovima da ne bi stvorili "parove vs. singlovi" dinamiku. Takođe, izbegnite sedenje svih novopečenih parova za jedan sto - može biti nezgodno.',
                  zh: '情侣宜同桌但不必「独占一桌」；多对情侣与单身朋友混坐，可避免尴尬分区。热恋中的几对若全挤一桌，也容易互相拘谨。'
                })}
              </p>
            </div>
          </div>
        </section>

        {/* Step 5 */}
        <section className="mb-8 bg-white rounded-xl p-6 shadow-md border-l-4 border-pink-600">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            5️⃣ {pickBody({ en: 'Test and Adjust', hr: 'Testirajte i Prilagodite', zh: '彩排心态：先试错再定稿' })}
          </h2>
          <p className="text-gray-800 mb-4">
            {pickBody({
              en: 'You\'ll never nail the perfect arrangement on the first try. Here\'s how to test your plan:',
              hr: 'Nikada nećete pogoditi savršen raspored iz prvog pokušaja. Evo kako da testirate vaš plan:',
              zh: '第一版座位很少一次到位，建议这样自检：'
            })}
          </p>
          
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <p className="text-gray-800">
                <strong>{pickBody({ en: 'Visualize:', hr: 'Vizualizujte:', zh: '可视化：' })}</strong>{' '}
                {pickBody({
                  en: `Use ${SEATING_APP_NAME_EN} to see the arrangement in visual format. It's easier to spot problems when you see tables graphically.`,
                  hr: `Koristite ${SEATING_APP_NAME_EN} da vidite raspored u vizuelnom formatu. Lakše je uočiti probleme kada vidite stolove grafički.`,
                  zh: `用 ${SEATING_APP_NAME_ZH} 看图排桌，哪桌太靠边、哪桌动线交叉会一目了然。`
                })}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <p className="text-gray-800">
                <strong>{pickBody({ en: 'Check each table:', hr: 'Proverite svaki sto:', zh: '逐桌脑补对话：' })}</strong>{' '}
                {pickBody({
                  en: 'Imagine the conversation at that table. Are there common topics? Can the "quietest" person be included?',
                  hr: 'Zamislite razgovor za tim stolom. Ima li zajedničkih tema? Može li "najtiša" osoba biti uključena?',
                  zh: '想象这一桌会聊什么？最内向的那位有没有自然卷入话题的机会？'
                })}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <p className="text-gray-800">
                <strong>{pickBody({ en: 'Ask trusted people:', hr: 'Pitajte pouzdane ljude:', zh: '问问知情人：' })}</strong>{' '}
                {pickBody({
                  en: 'Show the arrangement to close friends or family who know most guests. They can spot problems you missed.',
                  hr: 'Pokažite raspored bliskim prijateljima ili porodici koji poznaju većinu gostiju. Oni mogu uočiti probleme koje ste vi propustili.',
                  zh: '把初稿给熟悉亲友圈的发小或父母辈看一眼，他们往往能立刻指出「这两人不能同桌」。'
                })}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <p className="text-gray-800">
                <strong>{pickBody({ en: 'Be flexible:', hr: 'Budite fleksibilni:', zh: '预留弹性：' })}</strong>{' '}
                {pickBody({
                  en: 'Expect that you\'ll need to make changes as guests confirm or cancel. Digital tools save you time here.',
                  hr: 'Očekujte da ćete morati napraviti izmene kako gosti potvrđuju ili odustaju. Digitalni alati vam štede vreme ovde.',
                  zh: '临近婚礼总有人临时缺席或带同伴，数字化工具改起来更快，避免手写稿涂改成一团。'
                })}
              </p>
            </div>
          </div>
        </section>

        {/* Advanced Tips */}
        <section className="mb-8 bg-gradient-to-r from-indigo-50 to-rose-50 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            🚀 {pickBody({ en: 'Advanced Tips', hr: 'Napredni Saveti', zh: '进阶小技巧' })}
          </h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-indigo-900 mb-2">
                💬 {pickBody({
                  en: 'Creating "Themes" for Tables',
                  hr: 'Kreiranje "Tema" za Stolove',
                  zh: '给每桌一个轻松的话题抓手'
                })}
              </h3>
              <p className="text-gray-800 text-sm">
                {pickBody({
                  en: 'Some wedding planners recommend creating mini-themes for each table - e.g., "sports enthusiasts," "travelers," "book lovers." This gives people an instant conversation topic.',
                  hr: 'Neki wedding planneri preporučuju kreiranje mini-tema za svaki sto - npr. "sportski entuzijasti", "putnici", "ljubitelji knjiga". Ovo daje ljudima trenutnu temu za razgovor.',
                  zh: '不少策划师会给每桌藏一个小话题标签（旅行、运动、校友等），来宾更容易自然破冰——不必写在席卡上，你心里有个谱即可。'
                })}
              </p>
            </div>

            <div>
              <h3 className="font-bold text-indigo-900 mb-2">
                🎲 {pickBody({ en: 'Table Icebreaker Games', hr: 'Igre za Upoznavanje za Stolom', zh: '桌边破冰小卡' })}
              </h3>
              <p className="text-gray-800 text-sm">
                {pickBody({
                  en: 'For tables with people who don\'t know each other well, consider adding a small card with icebreaker questions or interesting facts about the couple. This helps conversations start naturally.',
                  hr: 'Za stolove sa ljudima koji se ne poznaju dobro, razmislite o dodavanju male kartice sa pitanjima za upoznavanje ili zanimljivim činjenicama o mladencima. Ovo pomaže da se razgovori pokrenu prirodno.',
                  zh: '陌生宾客较多的桌，可在餐具旁放一张小卡：两三个破冰问题或与新人有关的小彩蛋，聊天会很快热起来。'
                })}
              </p>
            </div>

            <div>
              <h3 className="font-bold text-indigo-900 mb-2">
                📸 {pickBody({ en: 'Think About Photos', hr: 'Razmislite o Fotografijama', zh: '留给摄影师的好机位' })}
              </h3>
              <p className="text-gray-800 text-sm">
                {pickBody({
                  en: 'Position people you want photographed together at tables with good lighting and background. Photographers will thank you!',
                  hr: 'Pozicionirajte ljude koje želite da fotografišete zajedno na stolovima koji imaju dobar osvetljenje i pozadinu. Fotografi će vam biti zahvalni!',
                  zh: '希望合影留念的重要亲友，尽量安排在光线均匀、背景干净的一侧，摄影师后期也会省力许多。'
                })}
              </p>
            </div>
          </div>
        </section>

        {/* Common Scenarios */}
        <section className="mb-8 bg-white rounded-xl p-6 shadow-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            🎪 {pickBody({
              en: 'Specific Scenarios and Solutions',
              hr: 'Specifični Scenariji i Rešenja',
              zh: '常见棘手场景'
            })}
          </h2>
          
          <div className="space-y-4">
            <div className="border-l-4 border-red-400 pl-4 bg-red-50 p-3 rounded-r-lg">
              <h3 className="font-bold text-red-900 mb-2">
                {pickBody({
                  en: '❓ What If: Divorced Parents?',
                  hr: '❓ Šta Ako: Razvedeni Roditelji?',
                  zh: '❓ 如果父母离异且关系紧张？'
                })}
              </h3>
              <p className="text-gray-800 text-sm">
                {pickBody({
                  en: 'Seat them at different tables with their new partners and friends/family. If relations are very bad, seat them on different sides of the room. Talk to them about the arrangement in advance.',
                  hr: 'Sedite ih na različite stolove sa njihovim novim partnerima i prijateljima/porodicom. Ako su odnosi veoma loši, sedite ih na različitim stranama sale. Razgovarajte sa njima unapred o rasporedu.',
                  zh: '各自与新伴侣、亲友同桌即可；矛盾很深时，分区安排在场地两侧，并务必事前私下沟通，避免婚礼当天才暴露心结。'
                })}
              </p>
            </div>

            <div className="border-l-4 border-orange-400 pl-4 bg-orange-50 p-3 rounded-r-lg">
              <h3 className="font-bold text-orange-900 mb-2">
                {pickBody({
                  en: '❓ What If: Guest Who Doesn\'t Know Anyone?',
                  hr: '❓ Šta Ako: Gost Koji Ne Poznaje Nikoga?',
                  zh: '❓ 有位客人谁也不认识？'
                })}
              </h3>
              <p className="text-gray-800 text-sm">
                {pickBody({
                  en: 'Seat them with the best "bridges" - social people who will immediately bring them into conversation. Also, seat with people they share some interests with (same city, same industry, etc).',
                  hr: 'Sedite ih sa najboljim "mostovima" - društvenim ljudima koji će ih odmah uvesti u razgovor. Takođe, sednite sa ljudima sa kojima dele neke interese (isti grad, ista industrija, itd).',
                  zh: '务必安排「桥梁人物」同桌或邻桌；也可寻找同城、同行业等共同点，让人一进门就有话题。'
                })}
              </p>
            </div>

            <div className="border-l-4 border-green-400 pl-4 bg-green-50 p-3 rounded-r-lg">
              <h3 className="font-bold text-green-900 mb-2">
                {pickBody({
                  en: '❓ What If: Plus-One Not Confirmed?',
                  hr: '❓ Šta Ako: Plus-One Koji Nije Potvrđen?',
                  zh: '❓ 还有人不确定是否带家属？'
                })}
              </h3>
              <p className="text-gray-800 text-sm">
                {pickBody({
                  en: `Create flexible tables where you can easily add or remove a seat. Use ${SEATING_APP_NAME_EN} to quickly adjust the arrangement when you get confirmation.`,
                  hr: `Napravite fleksibilne stolove gde možete lako dodati ili ukloniti mesto. Koristite ${SEATING_APP_NAME_EN} da brzo prilagodite raspored kada dobijete potvrdu.`,
                  zh: `预留一桌弹性桌或在上座率低的桌旁留空位；确认后用 ${SEATING_APP_NAME_ZH} 拖拽更新，比手写快得多。`
                })}
              </p>
            </div>

            <div className="border-l-4 border-blue-400 pl-4 bg-blue-50 p-3 rounded-r-lg">
              <h3 className="font-bold text-blue-900 mb-2">
                {pickBody({
                  en: '❓ What If: Too Many/Few People for a Table?',
                  hr: '❓ Šta Ako: Previše/Premalo Ljudi za Sto?',
                  zh: '❓ 一桌人太多或凑不满？'
                })}
              </h3>
              <p className="text-gray-800 text-sm">
                {pickBody({
                  en: 'Round tables can accommodate 6-10 people (ideally 8), rectangular 8-12. If you\'re missing 1-2 people, consider merging with a similar group or using a smaller table. If you have too many, divide the group logically.',
                  hr: 'Okrugli stolovi mogu primiti 6-10 ljudi (idealno 8), pravougaoni 8-12. Ako vam fali 1-2 osobe, razmislite o spajanju sa sličnom grupom ili korišćenju manjeg stola. Ako imate previše, razdvojite grupu logički.',
                  zh: '圆桌常见 6～10 人（8 人往往最舒服），长条桌可按场地调整。缺人可与相近圈层合并；超员则按交情拆分，切勿硬塞导致服务质量下降。'
                })}
              </p>
            </div>
          </div>
        </section>

        {/* Conclusion */}
        <section className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            ✨ {pickBody({
              en: 'Conclusion: Perfect Arrangement Doesn\'t Exist, But...',
              hr: 'Zaključak: Savršen Raspored Ne Postoji, Ali...',
              zh: '结语：没有完美座位表，但可以有体面的一切'
            })}
          </h2>
          <p className="text-gray-800 mb-4">
            {pickBody({
              en: 'It\'s important to understand that there\'s no "perfect" arrangement that will make absolutely everyone happy. There will always be someone who would rather sit somewhere else. And that\'s okay!',
              hr: 'Važno je shvatiti da ne postoji "savršen" raspored koji će apsolutno sve ljude učiniti srećnim. Uvek će biti neko ko bi radije sedeo negde drugde. I to je u redu!',
              zh: '世上没有让每一个人都 100% 满意的座位表——总有人心里更想坐别处，这很正常。'
            })}
          </p>
          <p className="text-gray-800 mb-4">
            {pickBody({
              en: 'Your goal is to make the best possible arrangement with the information you have, respecting your guests\' needs and ensuring no one is in an uncomfortable situation. If you follow the principles from this guide, you\'re already 90% there.',
              hr: 'Vaš cilj je da napravite najbolji mogući raspored sa informacijama koje imate, poštujući potrebe vaših gostiju i osiguravajući da niko nije u neugodnoj situaciji. Ako sledite principe iz ovog vodiča, već ste 90% tamo.',
              zh: '你的目标是在已知信息下尽量周全：避免尴尬组合、照顾弱势宾客，让大家体面地完成这场聚会。按本文思路排下来，你已经完成了最难的 90%。'
            })}
          </p>
          <p className="text-gray-800 font-semibold">
            {pickBody({
              en: 'At the end of the day, your wedding will be successful because you\'re celebrating love with people you care about - not because of a perfect table arrangement. 💜',
              hr: 'Na kraju dana, vaše venčanje će biti uspešno jer slavite ljubav sa ljudima do kojih vam je stalo - ne zbog savršenog rasporeda stolova. 💜',
              zh: '婚礼之所以动人，是因为你和在乎的人一起庆祝；不是因为座位表完美无缺。祝你排桌顺利，现场满是笑声与拥抱。💜'
            })}
          </p>
        </section>

        {/* CTA */}
        <div className="wedding-cta-block rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold mb-3">
            {pickBody({ en: 'Ready to Get Started?', hr: 'Spremni da Počnete?', zh: '现在就动手排一桌温柔又有条理的座位吧' })}
          </h3>
          <p className="mb-6">
            {pickBody({
              en: `Use ${SEATING_APP_NAME_EN} to apply all these tips and create an arrangement that will make your guests happy.`,
              hr: `Koristite ${SEATING_APP_NAME_EN} da primenite sve ove savete i napravite raspored koji će vaše goste učiniti srećnim.`,
              zh: `打开 ${SEATING_APP_NAME_ZH}，把刚才的思路落成可拖拽、可导出的座位方案，让你的心意也被宾客感受到。`
            })}
          </p>
          <Link
            href="/guests"
            className="inline-block bg-white text-rose-600 font-bold px-8 py-3 rounded-full hover:bg-gray-100 transition-colors"
          >
            {pickBody({ en: 'Start Planning - Free!', hr: 'Počnite Planiranje - Besplatno!', zh: '免费开始规划' })}
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
          href="/blog/5-wedding-seating-mistakes"
          className="block bg-white rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚫</span>
            <div>
              <h4 className="font-semibold text-gray-900 hover:text-rose-600">
                {getContent({
                  en: '5 Mistakes When Arranging Wedding Guests',
                  hr: '5 Grešaka Pri Rasporedu Gostiju na Venčanju',
                  es: '5 Errores al Organizar Mesas de Boda',
                  de: '5 Fehler bei der Hochzeitssitzordnung',
                  fr: '5 Erreurs dans le Plan de Table de Mariage',
                  zh: '婚礼宾客座位五大常见错误'
                })}
              </h4>
              <p className="text-sm text-gray-600">
                {getContent({
                  en: 'Learn what not to do',
                  hr: 'Saznajte šta ne treba raditi',
                  es: 'Aprende qué no hacer',
                  de: 'Lernen Sie, was Sie nicht tun sollten',
                  fr: 'Apprenez ce qu\'il ne faut pas faire',
                  zh: '看看哪些坑不要踩'
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

