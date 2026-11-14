# AGENTS.md — Автономна продуктова команда Mriyii

Цей документ визначає організацію та конвеєр автономної продуктової команди **Mriyii** — платформи розумних вішлістів із груповими зборами через Монобанк, афіліат-монетизацією та ШІ-асистентом подарунків.

При виконанні кожної задачі розробка проходить послідовним конвеєром через **4 внутрішні ролі**:
`[Product Designer]` → `[Backend Engineer]` → `[Frontend Engineer]` → `[Tech Lead & Security]`

---

## 1. `[Product Designer]` — Дизайн-система **Apple × Дія Smoked Glass** & Конверсія
- **Візуальна мова:** **Smoked Obsidian & Titanium Glass** — щільне темне матове скло `rgba(15, 17, 26, 0.76)` із `backdrop-blur-[26px]` та світловим кантом `inset 0 1px 0 rgba(255, 255, 255, 0.22)` поверх живих неоново-пастельних mesh-градієнтів.
- **Типографіка та контраст (AAA):** Жодного блідо-сірого тексту на склі. Назви та заголовки — чисто білі (`#FFFFFF` / `text-white font-extrabold`), вторинний текст — яскраво-сріблястий (`#E2E8F0` / `text-slate-200 font-semibold`), суми в `₴` — моноширинні (`tabular-nums`), шрифт **MacPaw Fixel** (SIL OFL 1.1, Zero Legal Risk, без використання державного шрифту `e-Ukraine`, Тризуба чи префікса «є-»).
- **Гендерна персоналізація (`gender` → `themePreset`):**
  - **`rose_luxury` (👩 Дівчина — «Obsidian Velvet & Rose Gold»):** Оксамитова база `#130d21` + рожевий неон/пурпур/золото (`.mesh-luxury`), золотий бейдж ціни (`text-amber-300`), прогрес-бар `.shimmer-rose`, CTA `💸 Закинути на мрію` та `👑 Подарувати все`.
  - **`cyber_titanium` (👨 Чоловік — «Apple Pro Titanium & Cyber-Diia Mesh»):** Титанова база `#0b1120` + смарагд/індиго/ціан (`.mesh-cyber`), неоновий ціан для ціни (`text-cyan-300`), прогрес-бар `.shimmer-emerald`, CTA `🫙 Закинути в Банку` та `🎁 Забронювати`.
- **Емодзі-бокси:** Кожний товар має акцентний емодзі (`✨`, `🎧`, `💍`, `🎮`, `🏝️`) у боксі `56x56px` (`rounded-2xl`) з неоновою рамкою поруч з іконками `lucide-react`.
- **Delayed Auth (Відкладена реєстрація на `/`):** Користувач на лендінгу обирає стиль (`👩 Дівчина` / `👨 Чоловік`) і додає перші бажання за посиланням без логіну (чернетка зберігається у `localStorage`). Модалка входу з'являється лише при натисканні «Зберегти та отримати посилання», після чого чернетка автоматично мігрує в MongoDB (`migrateDraftWishlistOnAuth`).

---

## 2. `[Backend Engineer]` — Серверне ядро, БД та ШІ (`@google/genai`)
- **Стек:** Next.js App Router (Server Actions), TypeScript, MongoDB Atlas + Mongoose ODM, Zod-валідація, Firebase Auth + `firebase-admin`.
- **Serverless Database Pattern:** Глобальне кешоване підключення `global.mongoose` у `lib/mongodb.ts`.
- **Моделі даних (`models/*`):**
  - `User`: `firebaseUid`, `email`, `gender` (`'female' | 'male'`), `themePreset` (`'rose_luxury' | 'cyber_titanium'`), `aiPreferences`.
  - `Wishlist`: `ownerId`, `slug`, `title`, `themePreset`, `eventDate`, `isSurpriseActive`.
  - `GiftItem`: `wishlistId`, `title`, `emoji`, `description`, `price`, `currency`, `imageUrl`, `originalUrl`, `affiliateUrl`, `isBooked`, `bookedByName`, `bookedByEmail`, `bookingToken`, `monoJarUrl`, `monoJarId`, `jarTargetAmount`, `jarCurrentAmount`, `jarLastSyncedAt`, `isAiSurprise`.
- **Інтеграції:**
  - **OpenGraph + AI Fallback Parser (`lib/parser.ts`):** `cheerio` + автоматичний підбір категорійного `emoji` + фолбек через `gemini-2.5-flash`.
  - **Affiliate Proxy (`lib/affiliate.ts`):** Конверсія посилань у партнерські deeplinks + збереження `affiliateUrl` після досягнення 100% збору на Банку для кнопки «Придбати подарунок у магазині».
  - **Monobank Public API (`lib/monobank.ts`):** Синхронізація балансу Банки з обов'язковим **60-секундним кешуванням** (`jarLastSyncedAt`) для захисту від `429 Too Many Requests`.
  - **Gemini AI Engine (`lib/gemini.ts`):** `@google/genai` (`gemini-2.5-flash`) зі Structured Outputs (`responseSchema`), врахуванням `gender` та `aiPreferences` власника вішліста.

---

## 3. `[Frontend Engineer]` — Sitemap та Клієнтська архітектура
- **Sitemap:**
  - `/` — Лендінг із перемикачем тем (`👩 Rose Luxury` / `👨 Cyber Titanium`), інтерактивною пісочницею Delayed Auth (додавання першого товару без логіну) та живим демо-блоком.
  - `/dashboard` — Кабінет власника вішліста у стилі «Цифрового Паспорта Свята» (живий бейдж статусу, таймер, швидке додавання бажань за URL, анкета для ШІ, Сюрприз-режим).
  - `/w/[slug]` — Публічна сторінка для гостя у темі власника (`rose_luxury` або `cyber_titanium`), без реєстрації, бронювання, прогрес-бар Монобанки, віджет ШІ-асистента, віральний Growth Loop поп-ап та Affiliate Disclosure бейдж.
  - `/demo` — Живий приклад вішліста з перемикачем тем («Для неї / Для нього») та ролей («Очима Гостя / Очима Власника»).
  - `/privacy` та `/terms` — Службові сторінки для верифікації OAuth Google/Apple та CPA-мереж.

---

## 4. `[Tech Lead & Security]` — Непорушні правила безпеки
1. **СУВОРИЙ СЮРПРИЗ-РЕЖИМ:** Власник вішліста НІКОЛИ не отримує з сервера поля `bookedByName`, `bookedByEmail`, `bookingToken`, `jarCurrentAmount`, `jarLastSyncedAt` та лоти з `isAiSurprise: true` (фільтрація на рівні Mongoose `.select()` та DTO).
2. **АТОМАРНІСТЬ ТА АНТИ-ТРОЛІНГ:**
   - Бронювання виключно через `GiftItem.findOneAndUpdate({ _id, isBooked: false }, ...)`.
   - Правило анти-тролінгу: **не більше 2 активних бронювань** на один `guestEmail` або браузер (`existingBrowserTokens`) у межах одного `wishlistId`.
3. **БЕЗПЕКА МЕРЕЖІ ТА API:**
   - Захист від SSRF при парсингу URL (блокування локальних/приватних IPv4/IPv6 та DNS-перевірка).
   - Rate-limiting `5 запитів/хв` на ендпоінти `@google/genai`.
   - Кешування запитів до публічного API Monobank мінімум на `60 секунд` (`jarLastSyncedAt`).
   - Жодних індикаторів внутрішніх комісій чи доходів платформи в UI — лише дружній бейдж Affiliate Disclosure.
