import 'server-only'
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { bucket, client, presignGet, presignPut } from './b2-presign'

export { presignPut, presignGet }

export async function headBytes(key: string): Promise<number | null> {
  try {
    const r = await client().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }))
    return r.ContentLength ?? null
  } catch (err) {
    const e = err as { name?: string; $metadata?: { httpStatusCode?: number } }
    if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) return null
    throw err
  }
}

async function body(key: string, range?: string): Promise<Uint8Array> {
  const r = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: key, Range: range }))
  if (!r.Body) throw new Error('empty object body')
  return r.Body.transformToByteArray()
}

/** Bytes 0..end inclusive. */
export function readRange(key: string, end: number): Promise<Uint8Array> {
  return body(key, `bytes=0-${end}`)
}

export function getBytes(key: string): Promise<Uint8Array> {
  return body(key)
}

export async function deleteObject(key: string): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }))
}
