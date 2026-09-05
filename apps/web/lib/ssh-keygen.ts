// apps/web/lib/ssh-keygen.ts
import { utils } from 'ssh2'

export function generateServerKeypair(comment: string) {
  const { public: publicKey, private: privateKey } = utils.generateKeyPairSync('ed25519', {
    comment,
  })
  return { publicKey, privateKey }
}