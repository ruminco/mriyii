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

const ALLOWED_MONO_HOSTS = new Set(['send.monobank.ua', 'www.send.monobank.ua']);

/**
 * Перевіряє посилання на Банку Monobank та витягує ідентифікатор Банки (clientId / jarId).
 * Підтримує посилання формату https://send.monobank.ua/jar/XXXXXXXXXX
 */
export function extractMonoJarId(rawJarUrl: string): { cleanUrl: string; jarId: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawJarUrl.trim());
  } catch {
    throw new Error('Некоректне посилання на Банку Monobank.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Посилання на Банку Monobank повинно використовувати протокол HTTPS.');
  }

  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_MONO_HOSTS.has(host)) {
    throw new Error('Дозволені лише офіційні посилання https://send.monobank.ua/jar/...');
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
 * Отримує актуальний баланс та цільову суму Банки Monobank.
 * Примітка: Monobank віддає суми в копійках (мінімальних одиницях валюти), тому конвертуємо у гривні (/ 100),
 * якщо значення передано в копійках, або використовуємо fallback.
 */
export async function fetchMonoJarStatus(
  rawJarUrl: string,
  fallbackTargetUah?: number
): Promise<MonoJarStatus> {
  const { cleanUrl, jarId } = extractMonoJarId(rawJarUrl);

  let currentAmountUah = 0;
  let targetAmountUah = fallbackTargetUah;
  let title: string | undefined;

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
