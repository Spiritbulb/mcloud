/**
 * Per-store business settings for Reach.
 *
 * This lives in the app, not the database, on purpose: `stores` is a shared
 * mcloud table and we didn't want to bolt Reach-only columns onto it for a
 * one-store pilot. Once there's more than a couple of stores, move this to
 * a small `reach_store_settings` table (store_id, payment_model, markup_pct,
 * service_fee_kes) keyed the same way — the shape below is already meant to
 * mirror that.
 */
export type PaymentModel = 'escrow' | 'direct';

export interface ReachStoreSettings {
  storeId: string;
  paymentModel: PaymentModel;
  markupPct: number; // only applied when paymentModel === 'escrow'
  serviceFeeKes: number; // flat, only applied when paymentModel === 'escrow'
}

// The store created on the mcloud dashboard for this pilot.
export const REACH_STORE_ID = '6bff1366-d8ea-4a0a-a90d-55026bfcb464';

export const STORE_SETTINGS: Record<string, ReachStoreSettings> = {
  [REACH_STORE_ID]: {
    storeId: REACH_STORE_ID,
    paymentModel: 'escrow',
    markupPct: 0.06,
    serviceFeeKes: 3,
  },
};

export function settingsFor(storeId: string): ReachStoreSettings {
  return (
    STORE_SETTINGS[storeId] ?? {
      storeId,
      paymentModel: 'direct',
      markupPct: 0,
      serviceFeeKes: 0,
    }
  );
}

export function priceForBuyer(basePrice: number, storeId: string) {
  const s = settingsFor(storeId);
  if (s.paymentModel === 'escrow') {
    return Math.round(basePrice * (1 + s.markupPct));
  }
  return basePrice;
}
