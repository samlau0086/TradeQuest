export const DEFAULT_CURRENCY_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CNY: 7.2,
  JPY: 155,
  AUD: 1.52,
  CAD: 1.37
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CNY: '¥',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$'
};

export function normalizeCurrency(code?: string | null) {
  return String(code || 'USD').trim().toUpperCase() || 'USD';
}

export function getCurrencyRate(rates: Record<string, number> = {}, currency?: string | null) {
  const code = normalizeCurrency(currency);
  const rate = Number(rates[code] ?? DEFAULT_CURRENCY_RATES[code] ?? 1);
  return Number.isFinite(rate) && rate > 0 ? rate : 1;
}

export function convertFromUsd(amountUsd: number, currency?: string | null, rates: Record<string, number> = {}) {
  return Number(amountUsd || 0) * getCurrencyRate(rates, currency);
}

export function convertToUsd(amount: number, currency?: string | null, rates: Record<string, number> = {}) {
  return Number(amount || 0) / getCurrencyRate(rates, currency);
}

export function formatCurrency(amountUsd: number, currency?: string | null, rates: Record<string, number> = {}) {
  const code = normalizeCurrency(currency);
  const converted = convertFromUsd(amountUsd, code, rates);
  const symbol = CURRENCY_SYMBOLS[code] || `${code} `;
  const fractionDigits = ['JPY', 'KRW', 'VND'].includes(code) ? 0 : 2;
  return `${symbol}${converted.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  })}`;
}
