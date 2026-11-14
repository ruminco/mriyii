/**
 * Інтеграція з публічним API Monobank для синхронізації балансу «Банки» (спільні збори).
 */

export interface MonoJarStatus {
  monoJarUrl: string;
  monoJarId: string;
  jarCurrentAmount: number;
  jarTargetAmount?: number;
  currency: string;
  title?: string;
  isGoalReached: boolean;
}

const ALLOWED_JAR_OR_ENVELOPE_HOSTS = new Set([
  'send.monobank.ua',
  'www.send.monobank.ua',
  'next.privat24.ua',
  'www.next.privat24.ua',
]);

/**
 * Перевіряє посилання на Банку Monobank або Конверт Приват24 за суворим білим списком доменів.
 * Підтримує:
 * - https://send.monobank.ua/jar/XXXXXXXXXX
 * - https://next.privat24.ua/send/XXXXXXXXXX
 */
export function extractMonoJarId(rawJarUrl: string): {
  cleanUrl: string;
  jarId: string;
  provider: 'monobank' | 'privat24';
} {
  let parsed: URL;
  try {
    parsed = new URL(rawJarUrl.trim());
  } catch {
    throw new Error('Некоректне посилання на Банку Monobank або Конверт Приват24.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Посилання повинно використовувати захищений протокол HTTPS.');
  }

  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_JAR_OR_ENVELOPE_HOSTS.has(host)) {
    throw new Error(
      'Дозволені лише офіційні домени: https://send.monobank.ua/jar/... або https://next.privat24.ua/send/...'
    );
  }

  if (host.includes('privat24.ua')) {
    const p24Match = parsed.pathname.match(/^\/send\/([A-Za-z0-9_-]{4,64})\/?$/);
    if (!p24Match || !p24Match[1]) {
      throw new Error(
        'Не вдалося розпізнати ID Конверта Приват24. Формат: https://next.privat24.ua/send/XXXXXXXX'
      );
    }
    const envelopeId = p24Match[1];
    return {
      cleanUrl: `https://next.privat24.ua/send/${envelopeId}`,
      jarId: `p24_${envelopeId}`,
      provider: 'privat24',
    };
  }

  const match = parsed.pathname.match(/^\/jar\/([A-Za-z0-9_-]{6,64})\/?$/);
  if (!match || !match[1]) {
    throw new Error(
      'Не вдалося розпізнати ID Банки. Перевірте формат: https://send.monobank.ua/jar/XXXXXXXX'
    );
  }

  const jarId = match[1];
  return {
    cleanUrl: `https://send.monobank.ua/jar/${jarId}`,
    jarId,
    provider: 'monobank',
  };
}

interface MonobankPublicJarResponse {
  amount?: number;
  goal?: number;
  jarAmount?: number;
  jarGoal?: number;
  balance?: number;
  title?: string;
  name?: string;
}

/**
 * Отримує актуальний баланс та цільову суму Банки Monobank (або валідує Конверт Приват24).
 */
export async function fetchMonoJarStatus(
  rawJarUrl: string,
  fallbackTargetUah?: number
): Promise<MonoJarStatus> {
  const { cleanUrl, jarId, provider } = extractMonoJarId(rawJarUrl);

  let currentAmountUah = 0;
  let targetAmountUah = fallbackTargetUah;
  let title: string | undefined;

  if (provider === 'monobank') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`https://api.monobank.ua/bank/jar/${encodeURIComponent(jarId)}`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = (await response.json()) as MonobankPublicJarResponse;

      const rawBalance = data.amount ?? data.jarAmount ?? data.balance;
      const rawGoal = data.goal ?? data.jarGoal;

      if (typeof rawBalance === 'number' && rawBalance >= 0) {
        currentAmountUah = Math.round(rawBalance / 100);
      }

      if (typeof rawGoal === 'number' && rawGoal > 0) {
        targetAmountUah = Math.round(rawGoal / 100);
      }

      title = data.title ?? data.name;
    }
    } catch {
      // У разі тимчасової недоступності публічного ендпоінту повертаємо початковий стан (0 грн та задану ціль),
      // щоб не блокувати прив'язку Банки гостем.
    }
  } else {
    title = 'Конверт Приват24';
  }

  const isGoalReached =
    typeof targetAmountUah === 'number' &&
    targetAmountUah > 0 &&
    currentAmountUah >= targetAmountUah;

  return {
    monoJarUrl: cleanUrl,
    monoJarId: jarId,
    jarCurrentAmount: currentAmountUah,
    jarTargetAmount: targetAmountUah,
    currency: 'UAH',
    title,
    isGoalReached,
  };
}
