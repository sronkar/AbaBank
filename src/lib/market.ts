import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { isoDate } from "./dates";

const QUOTE_TTL_MS = 6 * 60 * 60 * 1000; // refresh cached EOD quotes every 6h
const FX_TTL_MS = 12 * 60 * 60 * 1000;

export type Quote = { ticker: string; closeUsd: number; asOf: string };

/** Fetch the latest market price for a US ticker from Yahoo Finance (free, no API key). */
export async function fetchQuoteFromYahoo(ticker: string): Promise<Quote | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker.toUpperCase()
  )}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (AbaBank family app)" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    chart?: {
      result?: Array<{
        meta?: {
          currency?: string;
          regularMarketPrice?: number;
          regularMarketTime?: number;
        };
      }>;
    };
  };
  const meta = data.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  if (!meta || !price || !Number.isFinite(price) || price <= 0) return null;
  // Only USD-quoted tickers — the FX pipeline assumes USD.
  if (meta.currency && meta.currency !== "USD") return null;
  const asOf = meta.regularMarketTime
    ? isoDate(new Date(meta.regularMarketTime * 1000))
    : isoDate(new Date());
  return { ticker: ticker.toUpperCase(), closeUsd: price, asOf };
}

/** Get a quote, preferring a fresh cache; falls back to stale cache if the fetch fails. */
export async function getQuote(tickerRaw: string): Promise<Quote | null> {
  const ticker = tickerRaw.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker)) return null;
  const cached = db.select().from(schema.prices).where(eq(schema.prices.ticker, ticker)).get();
  if (cached && Date.now() - cached.fetchedAt < QUOTE_TTL_MS) {
    return { ticker, closeUsd: cached.closeUsd, asOf: cached.asOf };
  }
  const fresh = await fetchQuoteFromYahoo(ticker);
  if (fresh) {
    db.insert(schema.prices)
      .values({ ticker, closeUsd: fresh.closeUsd, asOf: fresh.asOf, fetchedAt: Date.now() })
      .onConflictDoUpdate({
        target: schema.prices.ticker,
        set: { closeUsd: fresh.closeUsd, asOf: fresh.asOf, fetchedAt: Date.now() },
      })
      .run();
    return fresh;
  }
  if (cached) return { ticker, closeUsd: cached.closeUsd, asOf: cached.asOf };
  return null;
}

/** USD -> family-currency rate. Returns 1 for USD. Falls back to last known rate. */
export async function getFxRate(currency: string): Promise<number> {
  if (currency === "USD") return 1;
  const cached = db.select().from(schema.fxRate).where(eq(schema.fxRate.id, 1)).get();
  if (cached && Date.now() - cached.fetchedAt < FX_TTL_MS) return cached.rate;
  try {
    const res = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=USD&symbols=${encodeURIComponent(currency)}`,
      { signal: AbortSignal.timeout(10_000) }
    );
    if (res.ok) {
      const data = (await res.json()) as { rates?: Record<string, number>; date?: string };
      const rate = data.rates?.[currency];
      if (rate && rate > 0) {
        db.insert(schema.fxRate)
          .values({ id: 1, rate, asOf: data.date ?? isoDate(new Date()), fetchedAt: Date.now() })
          .onConflictDoUpdate({
            target: schema.fxRate.id,
            set: { rate, asOf: data.date ?? isoDate(new Date()), fetchedAt: Date.now() },
          })
          .run();
        return rate;
      }
    }
  } catch {
    // fall through to stale cache
  }
  if (cached) return cached.rate;
  throw new Error(`No FX rate available for ${currency}`);
}

/** Price of one share in family-currency cents (fractional cents preserved). */
export async function getPriceCents(ticker: string, currency: string): Promise<
  { priceCents: number; quote: Quote; fxRate: number } | null
> {
  const quote = await getQuote(ticker);
  if (!quote) return null;
  const fx = await getFxRate(currency);
  return { priceCents: quote.closeUsd * fx * 100, quote, fxRate: fx };
}
