'use client'

// "Last 14 days" on the Overview: takings per day as a sparkline, with the period total.

import type { DailyPoint } from '@mcloud/merchant/overview-series'
import { Panel } from '@mcloud/ui/kit/panel'
import { Sparkline } from '@mcloud/ui/kit/sparkline'
import { formatCurrency } from './overview-logic'

function shortDate(iso: string): string {
    return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

export function TrendPanel({ daily, currency, commerce }: { daily: DailyPoint[]; currency: string; commerce: boolean }) {
    if (daily.length < 2) return null
    const total = daily.reduce((n, d) => n + d.amount, 0)
    const count = daily.reduce((n, d) => n + d.count, 0)
    const noun = commerce ? (count === 1 ? 'order' : 'orders') : (count === 1 ? 'donation' : 'donations')
    return (
        <Panel title="Last 14 days" description={commerce ? 'Sales from paid orders' : 'Donations received'}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-2xl font-semibold tabular-nums text-foreground">{formatCurrency(total, currency)}</p>
                <p className="text-[13px] text-muted-foreground">{count} {noun}</p>
            </div>
            <Sparkline
                values={daily.map((d) => d.amount)}
                label={`${commerce ? 'Sales' : 'Donations'} per day, ${shortDate(daily[0].date)} to ${shortDate(daily[daily.length - 1].date)}`}
                height={72}
                className="mt-3 text-primary"
            />
            <div className="mt-1 flex justify-between text-[12px] text-muted-foreground">
                <span>{shortDate(daily[0].date)}</span>
                <span>Today</span>
            </div>
        </Panel>
    )
}
