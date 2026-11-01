// Platform email templates. Pure (no I/O) so they can be tested and previewed; send them
// with sendEmail() from '@mcloud/mail'. Every value that came from a person (store names,
// product titles, inviter names) goes through escapeHtml before it reaches the markup.

export type Email = { subject: string; html: string; text: string }

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

/** Subjects are plain text, but a newline in one would break the header. */
function oneLine(value: string): string {
    return value.replace(/[\r\n]+/g, ' ').trim()
}

export function formatMoney(amount: number, currency = 'KES'): string {
    const n = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(amount) || 0)
    return `${currency} ${n}`
}

type Block =
    | { p: string }
    | { rows: [label: string, value: string][] }

type LayoutInput = {
    brand?: string
    heading: string
    blocks: Block[]
    cta?: { label: string; url: string }
    footnote?: string
}

// All inputs are plain text; layout escapes them. Inline styles only: mail clients drop <style>.
function render({ brand = 'mcloud.co.ke', heading, blocks, cta, footnote }: LayoutInput): { html: string; text: string } {
    const html: string[] = [
        '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">',
        `<p style="font-size:14px;color:#6b7280;margin:0 0 24px">${escapeHtml(brand)}</p>`,
        `<h1 style="font-size:22px;font-weight:700;color:#111;margin:0 0 12px">${escapeHtml(heading)}</h1>`,
    ]
    const text: string[] = [heading, '']

    for (const b of blocks) {
        if ('p' in b) {
            html.push(`<p style="font-size:15px;color:#374151;margin:0 0 16px">${escapeHtml(b.p)}</p>`)
            text.push(b.p, '')
        } else if (b.rows.length) {
            html.push('<table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;margin:0 0 24px">')
            for (const [label, value] of b.rows) {
                html.push(
                    `<tr><td style="padding:6px 0;border-bottom:1px solid #f3f4f6">${escapeHtml(label)}</td>` +
                        `<td style="padding:6px 0;border-bottom:1px solid #f3f4f6;text-align:right">${escapeHtml(value)}</td></tr>`,
                )
                text.push(`${label}: ${value}`)
            }
            html.push('</table>')
            text.push('')
        }
    }

    if (cta) {
        html.push(
            `<a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#111;color:#fff;padding:12px 24px;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px">${escapeHtml(cta.label)} →</a>`,
        )
        text.push(`${cta.label}: ${cta.url}`, '')
    }
    if (footnote) {
        html.push(`<p style="font-size:12px;color:#9ca3af;margin:24px 0 0">${escapeHtml(footnote)}</p>`)
        text.push(footnote)
    }
    html.push('</div>')
    return { html: html.join('\n'), text: text.join('\n').trim() + '\n' }
}

// ── Team ───────────────────────────────────────────────────────────────

export function inviteEmail(input: { targetName: string; inviterName?: string | null; role: string; url: string }): Email {
    const target = input.targetName || 'a team'
    return {
        subject: oneLine(`You've been invited to join ${target} on Menengai Cloud`),
        ...render({
            heading: `You're invited to join ${target}`,
            blocks: [{ p: `${input.inviterName || 'Someone'} has invited you to join ${target} as a ${input.role}.` }],
            cta: { label: 'Accept invite', url: input.url },
            footnote: "This invite expires in 7 days. If you weren't expecting this, you can ignore it.",
        }),
    }
}

// ── Orders ─────────────────────────────────────────────────────────────

export type OrderLine = { title: string; quantity: number; price: number }

export type OrderSummary = {
    storeName: string
    orderNumber: string
    total: number
    currency: string
    items: OrderLine[]
}

function lineRows(order: OrderSummary): [string, string][] {
    return [
        ...order.items.map((i): [string, string] => [`${i.quantity} × ${i.title}`, formatMoney(i.price * i.quantity, order.currency)]),
        ['Total', formatMoney(order.total, order.currency)],
    ]
}

/** To the store's managers when an order is paid. */
export function newOrderEmail(order: OrderSummary & { customer?: string | null; ordersUrl: string }): Email {
    const total = formatMoney(order.total, order.currency)
    return {
        subject: oneLine(`New order ${order.orderNumber} · ${total}`),
        ...render({
            heading: `New paid order for ${order.storeName}`,
            blocks: [
                { p: `Order ${order.orderNumber} has been paid${order.customer ? ` by ${order.customer}` : ''}.` },
                { rows: lineRows(order) },
            ],
            cta: { label: 'View orders', url: order.ordersUrl },
            footnote: 'You get this email because you manage this store on Menengai Cloud.',
        }),
    }
}

/** To the shopper when their order is paid. Sent by the platform on the store's behalf. */
export function orderConfirmationEmail(order: OrderSummary & { orderUrl: string }): Email {
    return {
        subject: oneLine(`Your ${order.storeName} order ${order.orderNumber} is confirmed`),
        ...render({
            brand: order.storeName,
            heading: 'Thanks for your order',
            blocks: [
                { p: `We've received your payment for order ${order.orderNumber}. ${order.storeName} will be in touch about delivery.` },
                { rows: lineRows(order) },
            ],
            cta: { label: 'View your order', url: order.orderUrl },
            footnote: `${order.storeName} runs on Menengai Cloud. For questions about this order, contact the store through its website.`,
        }),
    }
}

// ── Billing ────────────────────────────────────────────────────────────

export function walletTopupEmail(input: {
    orgName: string
    amountKes: number
    balanceKes: number
    receipt?: string | null
    billingUrl: string
}): Email {
    const amount = formatMoney(input.amountKes)
    return {
        subject: oneLine(`${amount} added to your ${input.orgName} wallet`),
        ...render({
            heading: 'Wallet top-up received',
            blocks: [
                { p: `Your M-PESA payment has been added to the ${input.orgName} wallet.` },
                {
                    rows: [
                        ['Amount', amount],
                        ...(input.receipt ? [['M-PESA receipt', input.receipt] as [string, string]] : []),
                        ['New balance', formatMoney(input.balanceKes)],
                    ],
                },
            ],
            cta: { label: 'Open billing', url: input.billingUrl },
        }),
    }
}

export function planPurchasedEmail(input: {
    storeName: string
    planLabel: string
    amountKes: number
    periodEnd: string
    balanceKes: number
    billingUrl: string
}): Email {
    const until = new Date(input.periodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Nairobi' })
    return {
        subject: oneLine(`${input.storeName} is on the ${input.planLabel} plan`),
        ...render({
            heading: `${input.planLabel} plan active`,
            blocks: [
                { p: `${input.storeName} is on the ${input.planLabel} plan until ${until}. The charge was paid from your organization wallet.` },
                {
                    rows: [
                        ['Charged', formatMoney(input.amountKes)],
                        ['Active until', until],
                        ['Wallet balance', formatMoney(input.balanceKes)],
                    ],
                },
            ],
            cta: { label: 'Open billing', url: input.billingUrl },
        }),
    }
}

// ── Ecosystem ──────────────────────────────────────────────────────────

export function waitlistEmail(input: { productLabel: string }): Email {
    return {
        subject: oneLine(`You're on the ${input.productLabel} waitlist`),
        ...render({
            brand: 'Spiritbulb',
            heading: "You're on the list",
            blocks: [{ p: `We'll email you at this address when ${input.productLabel} is ready.` }],
        }),
    }
}
