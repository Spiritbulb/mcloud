import 'server-only'
import { Resend } from 'resend'

// Welcome email sent once when someone is newly added to the beta. Tells them
// they're in and how to opt into the Android closed test. Non-fatal: a failure
// here never blocks the signup.

const PLAY_OPT_IN_URL = process.env.BETA_PLAY_OPT_IN_URL || ''

function getResend(): Resend | null {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return null
    return new Resend(apiKey)
}

export async function sendBetaWelcome(email: string): Promise<{ ok: boolean; error?: string }> {
    const resend = getResend()
    if (!resend) return { ok: false, error: 'RESEND_API_KEY not configured' }

    const optInBlock = PLAY_OPT_IN_URL
        ? `<a href="${PLAY_OPT_IN_URL}" style="display:inline-block;background:#111;color:#fff;padding:12px 24px;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px">Opt in to the Android beta →</a>
  <p style="font-size:12px;color:#9ca3af;margin:24px 0 0">Open this on the Android device you'll test with — signed in to the Google account on this email — then install from the Play Store. The beta only works with Google accounts.</p>`
        : `<p style="font-size:15px;color:#374151;margin:0 0 8px">We'll follow up shortly with your invite link to install the app.</p>`

    try {
        const { error } = await resend.emails.send({
            from: 'Menengai Cloud <noreply@menengai.cloud>',
            to: email,
            subject: "You're in — welcome to the Menengai Cloud beta",
            html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
  <p style="font-size:14px;color:#6b7280;margin:0 0 24px">menengai.cloud</p>
  <h1 style="font-size:22px;font-weight:700;color:#111;margin:0 0 12px">You're on the beta 🎉</h1>
  <p style="font-size:15px;color:#374151;margin:0 0 24px">Thanks for joining the Menengai Cloud closed beta. You've been added to our tester group, so you'll get early access as we roll out.</p>
  ${optInBlock}
  <p style="font-size:12px;color:#9ca3af;margin:24px 0 0">If you didn't request this, you can ignore this email.</p>
</div>`,
        })
        if (error) return { ok: false, error: error.message }
        return { ok: true }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
}
