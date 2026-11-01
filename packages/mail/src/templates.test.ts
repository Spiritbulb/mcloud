import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
    escapeHtml,
    formatMoney,
    inviteEmail,
    newOrderEmail,
    orderConfirmationEmail,
    planPurchasedEmail,
    walletTopupEmail,
    waitlistEmail,
} from './templates'

const order = {
    storeName: 'Loc<d> Essence',
    orderNumber: 'ORD-1042',
    total: 4850,
    currency: 'KES',
    items: [
        { title: 'Ankara <b>Dress</b>', quantity: 1, price: 3200 },
        { title: 'Bracelet', quantity: 3, price: 550 },
    ],
}

test('escapeHtml covers markup and attribute breakouts', () => {
    assert.equal(escapeHtml(`<a href="x" onclick='y'>&`), '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;')
})

test('formatMoney', () => {
    assert.equal(formatMoney(4850), 'KES 4,850')
    assert.equal(formatMoney(12.5, 'USD'), 'USD 12.5')
})

test('person-supplied values never reach the HTML unescaped', () => {
    const mail = newOrderEmail({ ...order, customer: '<script>x</script>', ordersUrl: 'https://app.mcloud.co.ke/o"><x' })
    assert.ok(!mail.html.includes('<script>'))
    assert.ok(!mail.html.includes('<b>Dress'))
    assert.ok(!mail.html.includes('"><x'))
    assert.ok(mail.html.includes('Loc&lt;d&gt; Essence'))
    // The text part is plain, so it keeps the original characters.
    assert.ok(mail.text.includes('1 × Ankara <b>Dress</b>: KES 3,200'))
})

test('order emails list lines and the total', () => {
    const mail = orderConfirmationEmail({ ...order, orderUrl: 'https://shop.example.com/orders/ORD-1042' })
    assert.equal(mail.subject, 'Your Loc<d> Essence order ORD-1042 is confirmed')
    assert.ok(mail.text.includes('3 × Bracelet: KES 1,650'))
    assert.ok(mail.text.includes('Total: KES 4,850'))
    assert.ok(mail.html.includes('href="https://shop.example.com/orders/ORD-1042"'))
})

test('subjects stay on one line', () => {
    const mail = inviteEmail({ targetName: 'Evil\r\nBcc: x@y.z', role: 'admin', url: 'https://mcloud.co.ke/invite/t' })
    assert.ok(!/[\r\n]/.test(mail.subject))
    assert.ok(mail.text.includes('Someone has invited you'))
})

test('wallet top-up omits a missing receipt', () => {
    const withReceipt = walletTopupEmail({ orgName: 'Acme', amountKes: 500, balanceKes: 1500, receipt: 'TJK3', billingUrl: 'https://mcloud.co.ke/org/acme/billing' })
    assert.ok(withReceipt.text.includes('M-PESA receipt: TJK3'))
    const without = walletTopupEmail({ orgName: 'Acme', amountKes: 500, balanceKes: 1500, billingUrl: 'https://mcloud.co.ke/org/acme/billing' })
    assert.ok(!without.text.includes('receipt'))
})

test('plan email shows the period end in Nairobi time', () => {
    // 22:30 UTC on 30 Nov is already 1 December in Nairobi.
    const mail = planPurchasedEmail({ storeName: 'Acme', planLabel: 'Pro', amountKes: 1500, periodEnd: '2026-11-30T22:30:00Z', balanceKes: 0, billingUrl: 'https://x' })
    assert.ok(mail.text.includes('until 1 December 2026'))
})

test('waitlist', () => {
    assert.equal(waitlistEmail({ productLabel: 'Nuru' }).subject, "You're on the Nuru waitlist")
})
