# @mcloud/mail

Platform email through Resend. Server-only (reads `RESEND_API_KEY`).

- `sendEmail({ to, subject, html, text, from?, replyTo?, idempotencyKey? })` never throws; it
  returns `{ ok, id }` or `{ ok: false, error }`. Emails are side effects of something that already
  happened, so a mail outage must not fail that request.
- Templates live in `@mcloud/mail/templates`. They are pure and take plain text; every value is
  escaped. Add new ones there with a test, not inline HTML in a route.
- Pass an `idempotencyKey` for event emails (`order-paid/<orderId>/...`) so a retried webhook
  cannot send twice. Call senders from `after()` in route handlers so they do not delay the response.

What sends today: org/store invites, paid orders (push + email to managers, confirmation to the
shopper), wallet top-ups, plan purchases, the waitlist confirmation and handoff recovery.
