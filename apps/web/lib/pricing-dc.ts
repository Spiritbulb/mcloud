// apps/web/lib/pricing.ts
// EUR/month price table for UpCloud Starter/Premium plans — every entry
// below is copied directly from calc.upcloud.com (UpCloud's own official
// cost calculator), not extrapolated. If a plan is missing from this table,
// it means it hasn't been checked against the calculator yet — do NOT
// invent a number for it; leave it out and it'll show as unpriced.
//
// Cloud Native plans are intentionally excluded: they ship with 0GB storage
// and require a separately-attached block storage device, which this form
// doesn't support yet.
export const PLAN_EUR_PRICE: Record<string, number> = {
  // Starter — confirmed via calc.upcloud.com
  'STARTER-1xCPU-1GB': 3,
  'STARTER-1xCPU-2GB': 6,
  'STARTER-2xCPU-2GB': 8,
  'STARTER-1xCPU-4GB': 10,
  'STARTER-2xCPU-4GB': 12,
  'STARTER-2xCPU-8GB': 18,
  'STARTER-4xCPU-8GB': 20,
  'STARTER-2xCPU-16GB': 24,
  'STARTER-4xCPU-16GB': 28,

  // Premium — confirmed via calc.upcloud.com
  'PREMIUM-1xCPU-1GB': 5,
  'PREMIUM-1xCPU-2GB': 12,
  'PREMIUM-2xCPU-2GB': 16,
  'PREMIUM-2xCPU-4GB': 26,
  'PREMIUM-2xCPU-8GB': 38,
  'PREMIUM-4xCPU-8GB': 52,
  'PREMIUM-2xCPU-16GB': 72,
  'PREMIUM-4xCPU-16GB': 92,
  'PREMIUM-4xCPU-32GB': 142,
  'PREMIUM-8xCPU-16GB': 148,
  'PREMIUM-8xCPU-32GB': 192,
  'PREMIUM-8xCPU-64GB': 268,
  'PREMIUM-16xCPU-32GB': 310,
  'PREMIUM-16xCPU-64GB': 384,
  'PREMIUM-8xCPU-128GB': 480,
  'PREMIUM-24xCPU-96GB': 576,
  // PREMIUM-32xCPU-64GB, PREMIUM-32xCPU-128GB, PREMIUM-38xCPU-192GB,
  // PREMIUM-48xCPU-96GB, PREMIUM-48xCPU-256GB, PREMIUM-64xCPU-128GB,
  // PREMIUM-64xCPU-384GB, PREMIUM-80xCPU-512GB — not yet checked against
  // the calculator (you said "it keeps going, I won't for now"). These
  // will correctly show as unpriced until added here.
}

// Tapered markup, calibrated against Truehost's own unmanaged non-Kenya
// entry VPS (~KSh 560-699/mo for ~1vCPU/2GB, roughly 25-55% over raw
// provider cost) rather than their local-Nairobi or managed tiers, which
// carry a legitimate latency/support premium not comparable to a plain
// resold UpCloud box.
function markupFor(eurPrice: number): number {
  if (eurPrice <= 6) return 0.55
  if (eurPrice <= 12) return 0.45
  if (eurPrice <= 24) return 0.35
  return 0.25
}

export function getPlanEurPrice(planName: string): number | null {
  return PLAN_EUR_PRICE[planName] ?? null
}

export function applyMarkup(eurPrice: number): number {
  return eurPrice * (1 + markupFor(eurPrice))
}