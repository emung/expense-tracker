/** Client-side mirror of the backend's MoneyCalculator, used for live previews only (the server is authoritative). */

const DECIMAL = /^\d+(?:[.,]\d+)?$/;

/** Parses a positive decimal typed with `,` or `.`; returns null for anything else. */
export function parseDecimal(input: string): number | null {
  const text = input.trim();
  if (!DECIMAL.test(text)) {
    return null;
  }
  return Number(text.replace(',', '.'));
}

/**
 * RON value of `amount` at `rate`, rounded HALF_UP to 2 decimals using exact integer arithmetic,
 * so it matches `amount.multiply(rate).setScale(2, HALF_UP)` on the server.
 */
export function toRon(amount: number, rate: number): number {
  const cents = BigInt(Math.round(Math.abs(amount) * 100));
  const micro = BigInt(Math.round(rate * 1_000_000));
  // cents * micro is in units of 1e-8 RON; convert back to cents with half-up rounding.
  const resultCents = (cents * micro + 500_000n) / 1_000_000n;
  return (Math.sign(amount) * Number(resultCents)) / 100;
}
