// apps/web/lib/ssh-keygen.ts
import ssh from 'ed25519-keygen/ssh'
import { randomBytes } from 'ed25519-keygen/utils'

export function generateServerKeypair(comment: string) {
  const seed = randomBytes(32)
  const { publicKey, privateKey } = ssh(seed, comment)
  return { publicKey, privateKey }
}