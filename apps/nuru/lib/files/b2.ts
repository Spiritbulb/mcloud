import 'server-only'
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { bucket, client, presignGet, presignPut } from './b2-presign'

export { presignPut, presignGet }

/** Size and stored Content-Type, or null when the object does not exist. */
export async function headObject(key: string): Promise<{ bytes: number; contentType: string | undefined } | null> {
  try {
    const r = await client().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }))
    if (r.ContentLength == null) return null
    return { bytes: r.ContentLength, contentType: r.ContentType }
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
