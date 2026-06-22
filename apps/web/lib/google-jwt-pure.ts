// Pure, dependency-free helpers shared by the Google SA-JWT signer. Kept in their
// own module (no `server-only`) so they can be exercised by standalone node scripts.

export function base64url(input: Buffer | string): string {
    return Buffer.from(input)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
}

/** Collapse \\n then \n so a PEM pasted into .env ends up with real newlines. */
export function normalizePrivateKey(raw: string): string {
    return raw.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n')
}
