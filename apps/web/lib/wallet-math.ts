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

/** PalPluss's charge per wallet top-up. The person topping up pays it on top of the amount. */
export const TOPUP_FEE_KES = 3
const TOPUP_FEE_CENTS = TOPUP_FEE_KES * 100

/** What the M-PESA prompt asks for: the amount to add plus the fee. */
export function topupChargeKes(amountKes: number): number {
  return amountKes + TOPUP_FEE_KES
}

/**
 * What to credit for a confirmed top-up. Only what was paid above the requested amount, up to the
 * fee, is kept as the fee, so a top-up started before the fee existed (paid exactly the requested
 * amount) is credited in full, and an underpayment credits what was actually paid.
 */
export function topupCreditCents(confirmedCents: number, requestedCents: number): number {
  const fee = Math.min(Math.max(confirmedCents - requestedCents, 0), TOPUP_FEE_CENTS)
  return confirmedCents - fee
}
