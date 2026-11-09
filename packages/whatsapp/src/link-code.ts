import { createHash, randomInt } from 'node:crypto'

export const LINK_CODE_DIGITS = 8

/** A fresh one-time code: 8 random digits. */
export function generateLinkCode(): string {
    return String(randomInt(0, 10 ** LINK_CODE_DIGITS)).padStart(LINK_CODE_DIGITS, '0')
}

/** "12345678" -> "1234 5678", for reading aloud and typing. */
export function formatLinkCode(code: string): string {
    return code.replace(/(\d{4})(?=\d)/g, '$1 ')
}

/** Only the hash is stored. Normalised to digits so "1234 5678" and "12345678" match. */
export function hashLinkCode(code: string): string {
    return createHash('sha256').update(code.replace(/\D/g, '')).digest('hex')
}

/** `LINK 1234 5678` (any case, spaces or dashes between digits) -> "12345678", else null. */
export function parseLinkCommand(text: string): string | null {
    const m = /^\s*link\s+([\d\s-]+?)\s*$/i.exec(text)
    if (!m) return null
    const digits = m[1].replace(/\D/g, '')
    return digits.length === LINK_CODE_DIGITS ? digits : null
}
