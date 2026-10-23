// Pure wallet arithmetic, safe to import in the browser (wallet.ts reads the database). Balances
// are KES cents (integers) to avoid float drift across many hourly charges.

export const MIN_TOPUP_KES = 20
export const MIN_TOPUP_CENTS = MIN_TOPUP_KES * 100

export function kesToCents(kes: number) {
  return Math.round(kes * 100)
}

export function centsToKes(cents: number) {
  return cents / 100
}

/** Hourly rate derived from a monthly KES price. Convention: monthly ÷ 730. */
export function hourlyRateCentsForMonthlyKes(monthlyKesPrice: number): number {
  return Math.ceil(kesToCents(monthlyKesPrice) / 730)
}
