/** Per-browser conveniences only; storage may be unavailable (private mode, blocked site data). */

const LAST_EUR_RATE = 'expense-tracker:last-eur-rate';

export function loadLastEurRate(): string {
  try {
    return localStorage.getItem(LAST_EUR_RATE) ?? '';
  } catch {
    return '';
  }
}

export function saveLastEurRate(rate: string): void {
  try {
    localStorage.setItem(LAST_EUR_RATE, rate);
  } catch {
    // Not persisted; the rate simply won't be pre-filled next time.
  }
}
