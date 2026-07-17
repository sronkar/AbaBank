const SYMBOLS: Record<string, string> = {
  USD: "$",
  ILS: "₪",
  EUR: "€",
  GBP: "£",
};

export function currencySymbol(currency: string): string {
  return SYMBOLS[currency] ?? currency + " ";
}

export function formatCents(cents: number, currency: string): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.round(cents));
  const whole = Math.floor(abs / 100);
  const frac = (abs % 100).toString().padStart(2, "0");
  return `${sign}${currencySymbol(currency)}${whole.toLocaleString("en-US")}.${frac}`;
}

/** Parse a user-entered amount like "12.50" into integer cents. Returns null if invalid. */
export function parseAmount(input: string): number | null {
  const trimmed = input.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const cents = Math.round(parseFloat(trimmed) * 100);
  if (!Number.isFinite(cents) || cents <= 0) return null;
  return cents;
}

export function formatShares(shares: number): string {
  return shares.toFixed(shares >= 100 ? 2 : 4).replace(/\.?0+$/, "");
}
