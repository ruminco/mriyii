import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen mesh-cyber text-white px-4 py-12">
      <div className="mx-auto max-w-3xl smoked-glass rounded-[28px] p-6 sm:p-8 space-y-4">
        <Link href="/" className="text-xs font-extrabold text-cyan-300 hover:underline">
          ← На головну Mriyii
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Умови використання (Terms of Service) — Mriyii
        </h1>
        <p className="text-sm font-semibold text-slate-200 leading-relaxed">
          Ласкаво просимо до Mriyii — платформи розумних вішлістів зі спільними зборами та ШІ-помічником подарунків.
        </p>
        <h2 className="text-lg font-extrabold text-white pt-2">
          1. Безкоштовне користування та перекази
        </h2>
        <p className="text-sm font-semibold text-slate-200 leading-relaxed">
          Платформа Mriyii не зберігає кошти користувачів і не стягує жодної комісії за перекази. Усі спільні збори відбуваються напряму через офіційні «Банки» АТ «Універсал Банк» (Monobank) за прямими посиланнями користувачів.
        </p>
        <h2 className="text-lg font-extrabold text-white pt-2">
          2. Правила доброчесного бронювання
        </h2>
        <p className="text-sm font-semibold text-slate-200 leading-relaxed">
          Для захисту списків бажань від спаму діє автоматичне обмеження: один гість може утримувати не більше 2 активних бронювань у межах одного вішліста.
        </p>
      </div>
    </main>
  );
}
