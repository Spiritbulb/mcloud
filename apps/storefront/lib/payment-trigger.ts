// Shared payment-provider triggers. Extracted from the cart flow so the donate
// island and the cart drive the SAME downstream provider steps from a single
// source. Each function takes an already-created `orderNumber` (from /checkout
// or /donate) plus the provider inputs, and performs ONLY the provider call —
// order creation, cart state, and navigation stay in the caller.
//
// The provider endpoints live in the web app (NEXT_PUBLIC_API_BASE_URL) and are
// keyed by orderId/orderNumber, so they are agnostic to the order's source
// (purchase vs donation). The manual M-PESA code step is a storefront route
// keyed by orderNumber.

const API = process.env.NEXT_PUBLIC_API_BASE_URL

export interface PaypalItem {
  name: string
  sku: string
  price: number
  quantity: number
}

/** Attach a manually-entered M-PESA transaction code to an order (best-effort). */
export async function submitMpesaCode(storeSlug: string, orderNumber: string, code: string): Promise<void> {
  const trimmed = code.trim()
  if (!trimmed) return
  await fetch(`/api/store/${storeSlug}/checkout/mpesa-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderNumber, code: trimmed }),
  })
}

/** Trigger an M-PESA STK push (Daraja). Returns the checkout-request id to poll. */
export async function triggerDarajaStkPush(
  storeSlug: string,
  orderNumber: string,
  phone: string,
  amount: number,
): Promise<{ checkoutRequestId: string; orderId: string }> {
  const res = await fetch(`${API}/payments/mpesa/stk-push`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storeSlug, phone, orderId: orderNumber, amount }),
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'STK push failed')
  return { checkoutRequestId: data.checkoutRequestId, orderId: orderNumber }
}

/** Create a PayPal order and return the approval URL to redirect the payer to. */
export async function triggerPaypalOrder(
  orderNumber: string,
  items: PaypalItem[],
  totalKES: number,
): Promise<string> {
  const res = await fetch(`${API}/payments/paypal/create-order`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: orderNumber, items, totalKES: Number(totalKES.toFixed(2)) }),
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'PayPal setup failed')
  return data.approvalUrl as string
}
