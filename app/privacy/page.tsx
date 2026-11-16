import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen mesh-cyber text-white px-4 py-12">
      <div className="mx-auto max-w-3xl smoked-glass rounded-[28px] p-6 sm:p-8 space-y-4">
        <Link href="/" className="text-sm font-extrabold text-cyan-300 hover:underline">
          ← На головну Mriyii
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Політика конфіденційності (Privacy Policy) — Mriyii
        </h1>
        <p className="text-sm font-semibold text-slate-200 leading-relaxed">
          Платформа Mriyii дбайливо ставиться до приватності користувачів. Ми використовуємо офіційну авторизацію Firebase Authentication (Google, Apple, Email) виключно для збереження ваших списків бажань.
        </p>
        <h2 className="text-lg font-extrabold text-white pt-2">
          1. Дані Сюрприз-режиму та бронювань
        </h2>
        <p className="text-sm font-semibold text-slate-200 leading-relaxed">
          Email-адреси гостей, вказані під час бронювання подарунка, використовуються виключно для генерації токена скасування броні та ніколи не передаються третім особам або власнику вішліста.
        </p>
        <h2 className="text-lg font-extrabold text-white pt-2">
          2. Партнерські програми (Affiliate Disclosure)
        </h2>
        <p className="text-sm font-semibold text-slate-200 leading-relaxed">
          Сервіс Mriyii є безкоштовним для користувачів. Деякі посилання на зовнішні інтернет-магазини можуть містити партнерські ідентифікатори (Admitad, Rozetka Affiliate тощо), які не впливають на кінцеву вартість товару для покупця.
        </p>
      </div>
    </main>
  );
}
