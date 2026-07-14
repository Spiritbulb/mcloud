// Pure amount-resolution + payload-shaping for the donate island. Separated
// from the React component so it unit-tests without a DOM.
export function resolveAmount(input: { preset: number | null; custom: string }): number | null {
  if (typeof input.preset === 'number' && input.preset > 0) return input.preset
  const n = Number(input.custom)
  return Number.isFinite(n) && n > 0 ? n : null
}

export interface DonatePayload {
  campaignId: string
  amount: number
  guest: { email?: string; mpesaPhone?: string }
  paymentMethod: 'mpesa' | 'paypal'
  idempotencyKey: string
  dedication?: string
}

export function buildDonatePayload(input: {
  campaignId: string; amount: number; email: string; phone: string
  paymentMethod: 'mpesa' | 'paypal'; idempotencyKey: string; dedication: string
}): DonatePayload {
  const dedication = input.dedication.trim()
  return {
    campaignId: input.campaignId,
    amount: input.amount,
    guest: { ...(input.email ? { email: input.email } : {}), ...(input.phone ? { mpesaPhone: input.phone } : {}) },
    paymentMethod: input.paymentMethod,
    idempotencyKey: input.idempotencyKey,
    ...(dedication ? { dedication } : {}),
  }
}
