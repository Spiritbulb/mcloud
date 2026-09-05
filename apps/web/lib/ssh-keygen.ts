// apps/web/lib/ssh-keygen.ts
import { getKeys } from 'micro-key-producer/ssh.js'
import { randomBytes } from 'micro-key-producer/utils.js'

export function generateServerKeypair(comment: string) {
  const seed = randomBytes(32)
  const keys = getKeys(seed, comment)
  return { publicKey: keys.publicKey, privateKey: keys.privateKey }
}