import React from 'react';
import { HeartHandshake } from 'lucide-react';

export function AffiliateDisclosureBadge() {
  return (
    <div className="smoked-glass rounded-2xl p-3.5 sm:p-4 border border-white/15 flex items-start sm:items-center gap-3 text-left">
      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
        <HeartHandshake className="w-5 h-5" />
      </div>
      <p className="text-xs font-semibold text-slate-200 leading-relaxed">
        <strong className="text-white font-extrabold">100% безкоштовно для вас:</strong>{' '}
        Сервіс Mriyii не бере жодних комісій за створення вішлістів чи перекази на Монобанку — ми
        отримуємо невелику винагороду від магазинів за рекомендації. Будь ласка, підтримайте нас і
        переходьте до покупки за кнопками на сайті!
      </p>
    </div>
  );
}
