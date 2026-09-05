// apps/web/lib/exchange-rate.ts
// EUR->KES via open.er-api.com (ExchangeRate-API's free, no-key open access
// endpoint). Frankfurter was tried first but only carries 31 ECB currencies
// and does not include KES — that was the source of the earlier 502s.
// Updates once daily; cached for an hour so we're not hammering it anyway.
// Attribution required per their terms: https://www.exchangerate-api.com
let cached: { rate: number; fetchedAt: number } | null = null
const CACHE_MS = 60 * 60 * 1000

export async function getEurToKesRate(): Promise<number> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_MS) {
    return cached.rate
  }

  const res = await fetch('https://open.er-api.com/v6/latest/EUR', {
    next: { revalidate: 3600 },
  })
  if (!res.ok) {
    if (cached) return cached.rate
    throw new Error(`Exchange rate request failed (${res.status})`)
  }

  const data = await res.json()
  if (data.result !== 'success') {
    if (cached) return cached.rate
    throw new Error('Exchange rate provider returned an error')
  }

  const rate = data.rates?.KES
  if (typeof rate !== 'number') {
    if (cached) return cached.rate
    throw new Error('Exchange rate response missing KES')
  }

  cached = { rate, fetchedAt: Date.now() }
  return rate
}