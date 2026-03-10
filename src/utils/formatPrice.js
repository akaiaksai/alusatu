const DEFAULT_RATE = 500
const MAX_REASONABLE_USD = 20000;

export function toPriceKzt(value) {
  if (value === undefined || value === null || isNaN(Number(value))) return 0;
  const num = Number(value);
  const isProbablyKzt = num > MAX_REASONABLE_USD;

  let rate = DEFAULT_RATE;
  try {
    const r = localStorage.getItem('currencyRate');
    if (r) {
      const parsed = Number(r);
      if (!isNaN(parsed) && parsed > 0) rate = parsed;
    }
  } catch {
    rate = DEFAULT_RATE;
  }

  return Math.round(isProbablyKzt ? num : num * rate);
}

export default function formatPrice(value) {
  if (value === undefined || value === null || isNaN(Number(value))) return "";
  const amountKzt = toPriceKzt(value);
  return new Intl.NumberFormat('ru-RU').format(amountKzt) + ' ₸';
}

export function formatKzt(value) {
  if (value === undefined || value === null || isNaN(Number(value))) return "";
  return new Intl.NumberFormat('ru-RU').format(Math.round(Number(value))) + ' ₸';
}

export function setCurrencyRate(rate) {
  try {
    if (!isNaN(Number(rate)) && Number(rate) > 0) {
      localStorage.setItem('currencyRate', String(Number(rate)));
      return true;
    }
  } catch {
    return false;
  }
  return false;
}
