// apps/web/lib/palpluss.ts
// Thin server-only client for the PalPluss API (docs.palpluss.com). Auth is
// HTTP Basic with the API key as username and an empty password — there is
// no separate token. Never import this from a client component.

const BASE = process.env.PALPLUSS_BASE_URL ?? 'https://api.palpluss.com/v1'

/**
 * Which PalPluss API key a call uses. `platform` is the wallet and Reach key. `store` is for
 * store checkout: PALPLUSS_STORE_API_KEY when set (so a problem with one store, such as a
 * suspension for failed prompts or the 60 requests a minute limit, cannot take down wallet
 * top-ups), otherwise the platform key.
 */
export type PalplussKey = 'platform' | 'store'

function getAuthHeader(key: PalplussKey = 'platform') {
  const apiKey = (key === 'store' ? process.env.PALPLUSS_STORE_API_KEY : undefined) || process.env.PALPLUSS_API_KEY
  if (!apiKey) throw new Error('PALPLUSS_API_KEY is not set')
  return `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`
}

async function palplussFetch<T>(path: string, init?: RequestInit, key: PalplussKey = 'platform'): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: getAuthHeader(key),
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...init?.headers,
    },
    cache: 'no-store',
  })

  const body = await res.json().catch(() => null)

  if (!body?.success) {
    const message = body?.error?.message ?? `PalPluss request failed (${res.status})`
    const code = body?.error?.code
    const error = new Error(code ? `${code}: ${message}` : message) as Error & {
      code?: string
      requestId?: string
      details?: Record<string, unknown>
    }
    error.code = code
    error.requestId = body?.requestId
    error.details = body?.error?.details
    throw error
  }

  return body.data as T
}

// ---- Types (only the fields we use) ----

export type StkInitiateResponse = {
  transactionId: string
  status: 'PENDING'
  amount: number
  currency: 'KES'
  phone: string
  accountReference: string
  transactionDesc: string
  transactionFee: number
  resultCode: string | null
  resultDescription: string | null
}

export type PalplussTransaction = {
  transactionId: string
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'EXPIRED' | 'REVERSED'
  amount: number
  accountReference?: string | null
  channelId?: string | null
}

export type PalplussChannelRow = {
  id: string
  type: string
  shortcode: string
  name: string
  accountNumber: string | null
  isDefault: boolean
}

export type PalplussWebhookPayload = {
  event: 'transaction.updated'
  event_type: 'transaction.success' | 'transaction.failed' | 'transaction.cancelled' | 'transaction.expired'
  transaction: {
    id: string
    type: 'STK' | 'B2C'
    status: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'EXPIRED'
    amount: number
    currency: 'KES'
    phone_number: string
    external_reference: string
    mpesa_receipt: string | null
    result_code: string
    result_desc: string
  }
}

// ---- Calls ----

/**
 * Initiates an M-Pesa STK Push to the customer's phone for a wallet top-up.
 * Result arrives asynchronously at `callbackUrl` (see the webhook route).
 */
export async function initiateStkPush(input: {
  amountKes: number
  phone: string
  accountReference: string // <= 12 chars, shown on customer's M-Pesa statement
  transactionDesc: string // <= 13 chars, shown on customer's PIN prompt
  callbackUrl: string
  /** Which payment channel (till or paybill) the customer pays. Omitted = the account's default channel. */
  channelId?: string
  key?: PalplussKey
}): Promise<StkInitiateResponse> {
  return palplussFetch<StkInitiateResponse>('/payments/stk', {
    method: 'POST',
    body: JSON.stringify({
      amount: input.amountKes,
      phone: input.phone,
      accountReference: input.accountReference,
      transactionDesc: input.transactionDesc,
      callbackUrl: input.callbackUrl,
      ...(input.channelId ? { channelId: input.channelId } : {}),
    }),
  }, input.key)
}

/** Fallback for confirming a transaction if a webhook never arrives. Call on demand, not in a loop. */
export async function getTransaction(transactionId: string, key: PalplussKey = 'platform'): Promise<PalplussTransaction> {
  return palplussFetch<PalplussTransaction>(`/transactions/${transactionId}`, undefined, key)
}

/** Payment channels (tills and paybills) registered on the account. */
export async function listChannels(key: PalplussKey = 'store'): Promise<PalplussChannelRow[]> {
  const data = await palplussFetch<{ items?: PalplussChannelRow[] }>('/payment-wallet/channels', undefined, key)
  return data.items ?? []
}

/** Register a till or paybill. Never set as the default: store channels are always picked by id. */
export async function createChannel(input: {
  name: string
  type: 'PAYBILL' | 'TILL_NUMBER'
  shortcode: string
  accountNumber: string | null
  key?: PalplussKey
}): Promise<PalplussChannelRow> {
  return palplussFetch<PalplussChannelRow>('/payment-wallet/channels', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      type: input.type,
      shortcode: input.shortcode,
      ...(input.accountNumber ? { accountNumber: input.accountNumber } : {}),
      isDefault: false,
    }),
  }, input.key ?? 'store')
}